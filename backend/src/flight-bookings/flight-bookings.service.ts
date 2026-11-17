import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { BookingGroup } from './dto/list-flight-bookings.dto';
import { FlightBookingStatus } from './enums/flight-booking-status.enum';
import { PAGE_SIZE } from './flight-booking.constants';
import {
  AdminFlightBookingFilter,
  AdminFlightBookingItem,
  AdminFlightBookingPage,
  AdminFlightBookingStatus,
} from './ports/admin-flight-bookings.types';
import type {
  FlightBookingPort,
  PayableFlightBooking,
} from './ports/flight-booking.port';
import { PAYMENTS_PORT } from './ports/payments.port';
import type { PaymentsPort } from './ports/payments.port';
import {
  FlightBooking,
  FlightBookingDocument,
} from './schemas/flight-booking.schema';
import { generateBookingReference } from './utils/booking-reference.util';

@Injectable()
export class FlightBookingsService
  implements OnModuleInit, OnModuleDestroy, FlightBookingPort
{
  private readonly logger = new Logger(FlightBookingsService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectModel(FlightBooking.name)
    private readonly bookingModel: Model<FlightBookingDocument>,
    @Optional()
    @Inject(PAYMENTS_PORT)
    private readonly payments?: PaymentsPort,
  ) {}

  // ---------- FLT-22: hold expiry (plain timer, same as hotel bookings) ----------

  onModuleInit() {
    this.timer = setInterval(() => {
      this.expireStaleHolds().catch((e) =>
        this.logger.error('expireStaleHolds failed', e),
      );
    }, 60_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async expireStaleHolds(): Promise<void> {
    const stale = await this.bookingModel
      .find({
        status: FlightBookingStatus.PendingPayment,
        holdExpiresAt: { $lt: new Date() },
      })
      .select('_id')
      .lean();

    for (const { _id } of stale) {
      await this.expireOne(String(_id), true);
    }
  }

  /**
   * Atomic PendingPayment -> Expired. Only the call that wins continues,
   * so seats can never be released twice.
   */
  private async expireOne(
    bookingId: string,
    onlyIfHoldPassed: boolean,
  ): Promise<boolean> {
    const filter: Record<string, unknown> = {
      _id: new Types.ObjectId(bookingId),
      status: FlightBookingStatus.PendingPayment,
    };
    if (onlyIfHoldPassed) filter.holdExpiresAt = { $lt: new Date() };

    const expired = await this.bookingModel.findOneAndUpdate(
      filter,
      { $set: { status: FlightBookingStatus.Expired } },
      { new: true },
    );
    if (!expired) return false;

    // TODO (needs Member 2's cabin schema): give the held seats back to inventory.

    if (this.payments) {
      try {
        await this.payments.cancelForExpiredHold('flight', bookingId);
      } catch (e) {
        this.logger.error(`cancelForExpiredHold failed for ${bookingId}`, e);
      }
    }
    return true;
  }

  // ---------- Payments contract (FLIGHT_BOOKING_PORT) ----------

  /** 404 if not found. No ownership check: payments compares userId itself. */
  async getPayableBooking(bookingId: string): Promise<PayableFlightBooking> {
    const doc = await this.findByIdOr404(bookingId);
    return {
      bookingId: String(doc._id),
      type: 'flight',
      reference: doc.reference ?? null,
      userId: String(doc.userId),
      status: doc.status,
      totalPrice: doc.totalPrice,
      holdExpiresAt: doc.holdExpiresAt,
      // TODO (Member 2's airline schema): real active flag and policies
      airlineActive: true,
      policies: { cancellationTiers: [], baggagePolicy: null },
      policiesAcceptedAt: doc.policiesAcceptedAt,
    };
  }

  /** PAY-02. 404 if not found or not the owner; 409 if not pending or hold expired. */
  async markPoliciesAccepted(bookingId: string, userId: string) {
    if (!Types.ObjectId.isValid(bookingId) || !Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Booking not found');
    }
    const doc = await this.bookingModel.findOne({
      _id: new Types.ObjectId(bookingId),
      userId: new Types.ObjectId(userId),
    });
    if (!doc) throw new NotFoundException('Booking not found');
    this.assertPayable(doc);

    doc.policiesAcceptedAt = new Date();
    await doc.save();
    return this.toUserView(doc, new Date());
  }

  /**
   * FLT-23. Called by payments only after Stripe confirms the payment.
   * Safe to call twice. 409 if not pending or the hold has expired.
   */
  async confirmBooking(bookingId: string, paymentId?: string) {
    const existing = await this.findByIdOr404(bookingId);
    if (existing.status === FlightBookingStatus.Confirmed) {
      return this.toUserView(existing, new Date()); // webhook retry: no error
    }
    this.assertPayable(existing);

    const now = new Date();
    let confirmed: FlightBookingDocument | null = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        // Atomic: only one caller can flip PendingPayment -> Confirmed.
        confirmed = await this.bookingModel.findOneAndUpdate(
          {
            _id: existing._id,
            status: FlightBookingStatus.PendingPayment,
            holdExpiresAt: { $gte: now },
          },
          {
            $set: {
              status: FlightBookingStatus.Confirmed,
              reference: generateBookingReference(),
              holdExpiresAt: null,
              ...(paymentId ? { paymentId } : {}),
            },
          },
          { new: true },
        );
        break;
      } catch (e) {
        // Duplicate reference (unique index): nothing was written, try a new one.
        if ((e as { code?: number }).code === 11000 && attempt < 4) continue;
        throw e;
      }
    }

    if (!confirmed) {
      // Lost a race: someone else confirmed, expired or cancelled it meanwhile.
      const fresh = await this.findByIdOr404(bookingId);
      if (fresh.status === FlightBookingStatus.Confirmed) {
        return this.toUserView(fresh, new Date());
      }
      throw new ConflictException(`Cannot confirm a ${fresh.status} booking`);
    }

    // TODO (Member 2's cabin schema): turn held seats into booked seats.
    // TODO (notifications): send BOOKING_CONFIRMED to the user.

    return this.toUserView(confirmed, new Date());
  }

  // ---------- Hooks for Member 2 (FLT-06 flight cancelled, FLT-05 time change) ----------

  /** User ids with a Confirmed booking on this flight (outbound or return). */
  async findConfirmedUserIdsForFlight(flightId: string): Promise<string[]> {
    if (!Types.ObjectId.isValid(flightId)) return [];
    const id = new Types.ObjectId(flightId);
    const ids = await this.bookingModel.distinct('userId', {
      status: FlightBookingStatus.Confirmed,
      $or: [{ flightId: id }, { returnFlightId: id }],
    });
    return ids.map((u) => String(u));
  }

  /**
   * FLT-06: the airline cancelled the flight. Cancels all Confirmed bookings
   * (100% refund, 'ProviderCancellation') and expires the pending holds.
   */
  async cancelAllForFlight(
    flightId: string,
  ): Promise<{ cancelled: number; expired: number }> {
    if (!Types.ObjectId.isValid(flightId)) {
      throw new NotFoundException('Flight not found');
    }
    const id = new Types.ObjectId(flightId);
    const match = { $or: [{ flightId: id }, { returnFlightId: id }] };
    let cancelled = 0;
    let expired = 0;

    // 1) Pending holds: expire and release (same atomic path as the timer)
    const pending = await this.bookingModel
      .find({ ...match, status: FlightBookingStatus.PendingPayment })
      .select('_id')
      .lean();
    for (const { _id } of pending) {
      if (await this.expireOne(String(_id), false)) expired++;
    }

    // 2) Confirmed bookings: cancel, then refund 100%
    const confirmed = await this.bookingModel
      .find({ ...match, status: FlightBookingStatus.Confirmed })
      .select('_id')
      .lean();

    for (const { _id } of confirmed) {
      const doc = await this.bookingModel.findOneAndUpdate(
        { _id, status: FlightBookingStatus.Confirmed },
        { $set: { status: FlightBookingStatus.Cancelled, cancelledAt: new Date(), refundPercent: 100 } },
        { new: true },
      );
      if (!doc) continue;
      cancelled++;

      // TODO (Member 2's cabin schema): return the booked seats to inventory.

      doc.refundAmount = doc.totalPrice;
      await doc.save();

      // Refund only AFTER the status is saved; a payments failure never undoes the cancel.
      if (doc.totalPrice > 0 && this.payments) {
        try {
          const r = await this.payments.refund(
            'flight',
            String(doc._id),
            doc.totalPrice,
            'ProviderCancellation',
          );
          doc.refundId = typeof r === 'string' ? r : r.id;
          await doc.save();
        } catch (e) {
          this.logger.error(`refund failed for ${String(doc._id)}`, e);
        }
      }
      // TODO (notifications): send BOOKING_CANCELLED to doc.userId.
    }

    return { cancelled, expired };
  }

  // ---------- FLT-25: the logged-in user's own bookings ----------

  async listMine(userId: string, group?: BookingGroup, page = 1) {
    const now = new Date();
    const query: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };

    if (group === BookingGroup.Cancelled) {
      query.status = FlightBookingStatus.Cancelled;
    } else if (group === BookingGroup.Upcoming) {
      query.status = FlightBookingStatus.Confirmed;
      query.$or = [{ arrivalTime: { $gte: now } }, { arrivalTime: null }];
    } else if (group === BookingGroup.Past) {
      query.status = FlightBookingStatus.Confirmed;
      query.arrivalTime = { $lt: now };
    }

    const [docs, total] = await Promise.all([
      this.bookingModel
        .find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE),
      this.bookingModel.countDocuments(query),
    ]);

    return {
      data: docs.map((d) => this.toUserView(d, now)),
      total,
      page,
      limit: PAGE_SIZE,
    };
  }

  /** Owner only. 404 (not 403) for other users' bookings, so they are not revealed. */
  async getMine(userId: string, bookingId: string) {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new NotFoundException('Booking not found');
    }
    const doc = await this.bookingModel.findOne({
      _id: new Types.ObjectId(bookingId),
      userId: new Types.ObjectId(userId),
    });
    if (!doc) throw new NotFoundException('Booking not found');
    return this.toUserView(doc, new Date());
  }

  // ---------- ACC-12: used by DELETE /api/users/me ----------

  /** True if the user has a Confirmed booking whose trip is not finished yet. */
  async hasUpcomingConfirmedBookings(
    userId: string,
    session?: ClientSession,
  ): Promise<boolean> {
    const found = await this.bookingModel
      .exists({
        userId: new Types.ObjectId(userId),
        status: FlightBookingStatus.Confirmed,
        // arrivalTime is null until the flight data is copied onto the booking,
        // so a missing value is treated as "not finished yet" (safe side).
        $or: [{ arrivalTime: { $gte: new Date() } }, { arrivalTime: null }],
      })
      .session(session ?? null);
    return !!found;
  }

  // ---------- ACC-17: used by GET /api/admin/bookings ----------

  async listAllForAdmin(
    filter: AdminFlightBookingFilter = {},
  ): Promise<AdminFlightBookingPage> {
    const page = Math.max(1, Math.floor(filter.page ?? 1));
    const limit = Math.min(
      100,
      Math.max(1, Math.floor(filter.limit ?? PAGE_SIZE)),
    );
    const now = new Date();
    const query: Record<string, unknown> = {};

    // createdAt range, both ends inclusive
    const createdAt: Record<string, Date> = {};
    if (filter.from) createdAt.$gte = this.parseDate(filter.from, false);
    if (filter.to) createdAt.$lte = this.parseDate(filter.to, true);
    if (Object.keys(createdAt).length) query.createdAt = createdAt;

    // "Completed" is derived: Confirmed + arrival time in the past
    if (filter.status === 'Completed') {
      query.status = FlightBookingStatus.Confirmed;
      query.arrivalTime = { $lt: now };
    } else if (filter.status === 'Confirmed') {
      query.status = FlightBookingStatus.Confirmed;
      query.$or = [{ arrivalTime: { $gte: now } }, { arrivalTime: null }];
    } else if (filter.status) {
      query.status = filter.status;
    }

    const [docs, total] = await Promise.all([
      this.bookingModel
        .find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.bookingModel.countDocuments(query),
    ]);

    return {
      data: docs.map((d) => this.toAdminItem(d, now)),
      total,
      page,
      limit,
    };
  }

  // ---------- helpers ----------

  private async findByIdOr404(bookingId: string): Promise<FlightBookingDocument> {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new NotFoundException('Booking not found');
    }
    const doc = await this.bookingModel.findById(bookingId);
    if (!doc) throw new NotFoundException('Booking not found');
    return doc;
  }

  /** 409 unless the booking is PendingPayment with an unexpired hold. */
  private assertPayable(doc: FlightBookingDocument): void {
    if (doc.status !== FlightBookingStatus.PendingPayment) {
      throw new ConflictException(`Cannot pay for a ${doc.status} booking`);
    }
    if (!doc.holdExpiresAt || doc.holdExpiresAt < new Date()) {
      throw new ConflictException('The hold on this booking has expired');
    }
  }

  private parseDate(value: string, endOfDay: boolean): Date {
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const date = new Date(
      isDateOnly
        ? `${value}${endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`
        : value,
    );
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid date: ${value}`);
    }
    return date;
  }

  private derivedStatus(
    doc: FlightBookingDocument,
    now: Date,
  ): AdminFlightBookingStatus {
    const arrived = doc.arrivalTime ? doc.arrivalTime < now : false;
    return doc.status === FlightBookingStatus.Confirmed && arrived
      ? 'Completed'
      : doc.status;
  }

  /** What the owner sees (FLT-25): reference, flight, date, passengers, cabin, status. */
  private toUserView(doc: FlightBookingDocument, now: Date) {
    return {
      bookingId: String(doc._id),
      reference: doc.reference ?? null,
      status: this.derivedStatus(doc, now),
      flightId: String(doc.flightId),
      returnFlightId: doc.returnFlightId ? String(doc.returnFlightId) : null,
      flightNumber: doc.flightNumber,
      airlineName: doc.airlineName,
      origin: doc.origin,
      destination: doc.destination,
      departureTime: doc.departureTime,
      arrivalTime: doc.arrivalTime,
      cabinClass: doc.cabinClass,
      passengers: doc.passengers.map((p) => ({
        fullName: p.fullName,
        type: p.type,
        extraBags: p.extraBags.length,
      })),
      baseFare: doc.baseFare,
      baggageFee: doc.baggageFee,
      totalPrice: doc.totalPrice,
      holdExpiresAt: doc.holdExpiresAt,
      policiesAcceptedAt: doc.policiesAcceptedAt,
      cancelledAt: doc.cancelledAt,
      refundAmount: doc.refundAmount,
      createdAt: doc.createdAt ?? null,
    };
  }

  private toAdminItem(
    doc: FlightBookingDocument,
    now: Date,
  ): AdminFlightBookingItem {
    const createdAt = doc.createdAt ?? new Date(0);

    return {
      type: 'flight',
      bookingId: String(doc._id),
      reference: doc.reference ?? null,
      userId: String(doc.userId),
      flightId: String(doc.flightId),
      flightNumber: doc.flightNumber ?? '',
      airlineId: doc.airlineId ? String(doc.airlineId) : '',
      airlineName: doc.airlineName ?? '',
      origin: doc.origin ?? '',
      destination: doc.destination ?? '',
      // TODO: these times are filled once the flight data is copied at hold time
      departureTime: doc.departureTime ?? createdAt,
      arrivalTime: doc.arrivalTime ?? createdAt,
      totalPrice: doc.totalPrice,
      status: this.derivedStatus(doc, now),
      createdAt,
    };
  }
}