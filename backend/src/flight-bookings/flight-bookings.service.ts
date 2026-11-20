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
import { Airline, AirlineDocument } from '../airlines/airline.schema';
import { daysUntil, refundPercentFor } from '../airlines/policy.util';
import { Cabin, CabinDocument } from '../flights/cabin.schema';
import { CabinClass, FlightStatus } from '../flights/enums/flight.enums';
import { Flight, FlightDocument } from '../flights/flight.schema';
import { NotificationType } from '../notifications/notification-type.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateFlightBookingDto } from './dto/create-flight-booking.dto';
import { BookingGroup } from './dto/list-flight-bookings.dto';
import { FlightBookingStatus } from './enums/flight-booking-status.enum';
import { HOLD_MINUTES, PAGE_SIZE } from './flight-booking.constants';
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
import type { PaymentsPort } from './ports/payments.port';
import { PAYMENTS_PORT } from './ports/payments.port';
import {
  FlightBooking,
  FlightBookingDocument,
} from './schemas/flight-booking.schema';
import { generateBookingReference } from './utils/booking-reference.util';
import { calculateBaggageFee } from './utils/pricing.util';

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class FlightBookingsService
  implements OnModuleInit, OnModuleDestroy, FlightBookingPort
{
  private readonly logger = new Logger(FlightBookingsService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectModel(FlightBooking.name)
    private readonly bookingModel: Model<FlightBookingDocument>,
    @InjectModel(Cabin.name)
    private readonly cabinModel: Model<CabinDocument>,
    @InjectModel(Flight.name)
    private readonly flightModel: Model<FlightDocument>,
    @InjectModel(Airline.name)
    private readonly airlineModel: Model<AirlineDocument>,
    private readonly notifications: NotificationsService,
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
   * so seats can never be released twice. No notification (GEN-01).
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

    await this.safely(
      () =>
        this.releaseHeld(
          this.legsOf(expired),
          expired.cabinClass,
          this.seatCount(expired.passengers),
        ),
      `release held seats of ${bookingId}`,
    );

    if (this.payments) {
      try {
        await this.payments.cancelForExpiredHold('flight', bookingId);
      } catch (e) {
        this.logger.error(`cancelForExpiredHold failed for ${bookingId}`, e);
      }
    }
    return true;
  }

  // ---------- FLT-19 / FLT-21: summary before payment (no seats reserved) ----------

  async summary(dto: CreateFlightBookingDto) {
    const p = await this.prepare(dto);
    return {
      flightNumber: p.outbound.flightNumber,
      airlineName: p.airline.name,
      origin: p.outbound.departureAirport,
      destination: p.outbound.arrivalAirport,
      departureTime: p.outbound.departureTime,
      arrivalTime: p.lastArrival,
      roundTrip: !!p.inbound,
      returnFlightNumber: p.inbound?.flightNumber ?? null,
      cabinClass: dto.cabinClass,
      passengers: dto.passengers.map((x) => ({
        fullName: x.fullName,
        type: x.type ?? 'adult',
        extraBags: x.extraBags?.length ?? 0,
      })),
      farePerPassenger: p.farePerPassenger,
      baseFare: p.baseFare,
      baggageFee: p.baggageFee,
      totalPrice: p.totalPrice,
      holdMinutesOnPayment: HOLD_MINUTES,
    };
  }

  // ---------- FLT-22: atomic seat hold + PendingPayment booking ----------

  async hold(userId: string, dto: CreateFlightBookingDto) {
    const p = await this.prepare(dto);
    const n = p.seatCount;

    // Atomic: seats are reserved only if enough remain, so concurrent
    // requests can never book more seats than available.
    const legs: Types.ObjectId[] = [p.outbound._id];
    if (p.inbound) legs.push(p.inbound._id);

    const reserved: Types.ObjectId[] = [];
    for (const leg of legs) {
      const ok = await this.holdSeats(leg, dto.cabinClass, n);
      if (!ok) {
        await this.safely(
          () => this.releaseHeld(reserved, dto.cabinClass, n),
          'roll back partial hold',
        );
        throw new ConflictException('Not enough seats available');
      }
      reserved.push(leg);
    }

    try {
      const booking = await this.bookingModel.create({
        userId: new Types.ObjectId(userId),
        flightId: p.outbound._id,
        returnFlightId: p.inbound?._id ?? null,
        airlineId: p.airline._id,
        flightNumber: p.outbound.flightNumber,
        airlineName: p.airline.name,
        origin: p.outbound.departureAirport,
        destination: p.outbound.arrivalAirport,
        departureTime: p.outbound.departureTime,
        arrivalTime: p.lastArrival,
        cabinClass: dto.cabinClass,
        passengers: dto.passengers.map((x) => ({
          fullName: x.fullName,
          dateOfBirth: x.dateOfBirth,
          passportNumber: x.passportNumber,
          type: x.type ?? 'adult',
          extraBags: x.extraBags ?? [],
        })),
        baseFare: p.baseFare,
        baggageFee: p.baggageFee,
        totalPrice: p.totalPrice,
        status: FlightBookingStatus.PendingPayment,
        holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000),
      });
      return this.toUserView(booking, new Date());
    } catch (e) {
      await this.safely(
        () => this.releaseHeld(reserved, dto.cabinClass, n),
        'release seats after failed booking insert',
      );
      throw e;
    }
  }

  // ---------- Payments contract (FLIGHT_BOOKING_PORT) ----------

  /** 404 if not found. No ownership check: payments compares userId itself. */
  async getPayableBooking(bookingId: string): Promise<PayableFlightBooking> {
    const doc = await this.findByIdOr404(bookingId);
    const airline = doc.airlineId
      ? await this.airlineModel.findById(doc.airlineId)
      : null;
    const cabin = await this.cabinModel.findOne({
      flight: doc.flightId,
      cabinClass: doc.cabinClass as CabinClass,
    });

    return {
      bookingId: String(doc._id),
      type: 'flight',
      reference: doc.reference ?? null,
      userId: String(doc.userId),
      status: doc.status,
      totalPrice: doc.totalPrice,
      holdExpiresAt: doc.holdExpiresAt,
      airlineActive: airline ? airline.isActive : true,
      policies: {
        cancellationTiers: (airline?.cancellationTiers ?? []).map((t) => ({
          daysBeforeDeparture: t.daysBeforeDeparture,
          refundPercent: t.refundPercent,
        })),
        baggagePolicy: {
          extraBagPrice: airline?.extraBagPrice ?? null,
          maxExtraBagsPerPassenger: airline?.maxExtraBags ?? 0,
          freeBags: cabin?.freeBags ?? null,
          maxBagWeightKg: cabin?.maxBagWeightKg ?? null,
        },
      },
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
      return this.toUserView(existing, new Date()); // webhook retry: no error, no 2nd notification
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

    // Held seats become booked seats (only the call that won the flip gets here).
    await this.safely(
      () =>
        this.convertHeldToBooked(
          this.legsOf(confirmed!),
          confirmed!.cabinClass,
          confirmed!.passengers.length,
        ),
      `convert held seats of ${bookingId}`,
    );

    // GEN-01: in-app notification (never throws)
    await this.notifications.send(
      confirmed.userId,
      NotificationType.BOOKING_CONFIRMED,
      `Your flight booking ${confirmed.reference} (${confirmed.origin} to ${confirmed.destination}) is confirmed.`,
      { bookingType: 'flight', bookingId: String(confirmed._id) },
    );

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
   * (100% refund, 'ProviderCancellation'), expires the pending holds and
   * sends the in-app notifications. Returns counts.
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
        {
          $set: {
            status: FlightBookingStatus.Cancelled,
            cancelledAt: new Date(),
            refundPercent: 100,
          },
        },
        { new: true },
      );
      if (!doc) continue;
      cancelled++;

      await this.safely(
        () =>
          this.releaseBooked(
            this.legsOf(doc),
            doc.cabinClass,
            this.seatCount(doc.passengers),
          ),
        `release booked seats of ${String(doc._id)}`,
      );

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

      await this.notifications.send(
        doc.userId,
        NotificationType.FLIGHT_CANCELLED,
        `Your flight booking ${doc.reference} was cancelled by the airline. A full refund has been issued.`,
        { bookingType: 'flight', bookingId: String(doc._id) },
      );
    }

    return { cancelled, expired };
  }

  // ---------- FLT-26: user cancellation with refund preview ----------

  private async computeRefund(doc: FlightBookingDocument) {
    if (doc.status !== FlightBookingStatus.Confirmed) {
      throw new ConflictException('Only Confirmed bookings can be cancelled');
    }
    if (!doc.departureTime || doc.departureTime <= new Date()) {
      throw new ConflictException(
        'Cancellation after departure is not allowed',
      );
    }
    const airline = doc.airlineId
      ? await this.airlineModel.findById(doc.airlineId)
      : null;
    const tiers = (airline?.cancellationTiers ?? []).map((t) => ({
      daysBeforeDeparture: t.daysBeforeDeparture,
      refundPercent: t.refundPercent,
    }));
    const refundPercent = refundPercentFor(tiers, daysUntil(doc.departureTime));
    const refundAmount =
      Math.round(((doc.totalPrice * refundPercent) / 100) * 100) / 100;
    return { refundPercent, refundAmount };
  }

  /** Step 1 of FLT-26: the user sees the refund before confirming. */
  async cancelPreview(userId: string, bookingId: string) {
    const doc = await this.findOwned(userId, bookingId);
    const { refundPercent, refundAmount } = await this.computeRefund(doc);
    return {
      bookingId: String(doc._id),
      reference: doc.reference ?? null,
      totalPrice: doc.totalPrice,
      refundPercent,
      refundAmount,
    };
  }

  /** Step 2 of FLT-26: cancel, release seats, refund (only if > 0), notify. */
  async cancelMine(userId: string, bookingId: string) {
    const existing = await this.findOwned(userId, bookingId);
    const { refundPercent, refundAmount } = await this.computeRefund(existing);

    // Atomic: only one request can flip Confirmed -> Cancelled.
    const doc = await this.bookingModel.findOneAndUpdate(
      { _id: existing._id, status: FlightBookingStatus.Confirmed },
      {
        $set: {
          status: FlightBookingStatus.Cancelled,
          cancelledAt: new Date(),
          refundPercent,
          refundAmount,
        },
      },
      { new: true },
    );
    if (!doc) throw new ConflictException('Booking is no longer Confirmed');

    await this.safely(
      () =>
        this.releaseBooked(
          this.legsOf(doc),
          doc.cabinClass,
          this.seatCount(doc.passengers),
        ),
      `release booked seats of ${String(doc._id)}`,
    );

    // Refund only AFTER the status is saved; a payments failure never undoes the cancel.
    if (refundAmount > 0 && this.payments) {
      try {
        const r = await this.payments.refund(
          'flight',
          String(doc._id),
          refundAmount,
          'UserCancellation',
        );
        doc.refundId = typeof r === 'string' ? r : r.id;
        await doc.save();
      } catch (e) {
        this.logger.error(`refund failed for ${String(doc._id)}`, e);
      }
    }

    await this.notifications.send(
      doc.userId,
      NotificationType.BOOKING_CANCELLED,
      `Your flight booking ${doc.reference} was cancelled. Refund: ${refundAmount} (${refundPercent}%).`,
      { bookingType: 'flight', bookingId: String(doc._id) },
    );

    return this.toUserView(doc, new Date());
  }

  private async findOwned(
    userId: string,
    bookingId: string,
  ): Promise<FlightBookingDocument> {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new NotFoundException('Booking not found');
    }
    const doc = await this.bookingModel.findOne({
      _id: new Types.ObjectId(bookingId),
      userId: new Types.ObjectId(userId),
    });
    if (!doc) throw new NotFoundException('Booking not found');
    return doc;
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
    const doc = await this.findOwned(userId, bookingId);
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
        $or: [{ arrivalTime: { $gte: new Date() } }, { arrivalTime: null }],
      })
      .session(session ?? null);
    return !!found;
  }

  // ACC-12: active Pending Payment holds also block deactivation.
  async hasActiveHold(userId: string): Promise<boolean> {
    const found = await this.bookingModel.exists({
      userId: new Types.ObjectId(userId),
      status: FlightBookingStatus.PendingPayment,
      holdExpiresAt: { $gt: new Date() },
    });
    return !!found;
  }

  // ACC-15: users with Confirmed flight bookings on an airline, so the admin
  // provider-deactivation flow can notify them. Existing bookings stay valid.
  async getUserIdsWithConfirmedBookingsForAirline(
    airlineId: string,
    onlyUpcoming = true,
  ): Promise<string[]> {
    if (!Types.ObjectId.isValid(airlineId)) return [];
    const query: Record<string, unknown> = {
      airlineId: new Types.ObjectId(airlineId),
      status: FlightBookingStatus.Confirmed,
    };
    if (onlyUpcoming) {
      query.$or = [
        { arrivalTime: { $gte: new Date() } },
        { arrivalTime: null },
      ];
    }
    const ids = await this.bookingModel.distinct('userId', query);
    return ids.map((id) => String(id));
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

    const createdAt: Record<string, Date> = {};
    if (filter.from) createdAt.$gte = this.parseDate(filter.from, false);
    if (filter.to) createdAt.$lte = this.parseDate(filter.to, true);
    if (Object.keys(createdAt).length) query.createdAt = createdAt;

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

  // ---------- seat inventory helpers (atomic updates on the cabins collection) ----------

  /** Reserve n seats only if enough remain. One atomic update, so no overselling. */
  private async holdSeats(
    flightId: Types.ObjectId,
    cabinClass: string,
    n: number,
  ): Promise<boolean> {
    const res = await this.cabinModel.updateOne(
      {
        flight: flightId,
        cabinClass: cabinClass as CabinClass,
        $expr: {
          $gte: [
            {
              $subtract: [
                '$totalSeats',
                { $add: ['$bookedSeats', '$heldSeats'] },
              ],
            },
            n,
          ],
        },
      },
      { $inc: { heldSeats: n } },
    );
    return res.modifiedCount === 1;
  }

  private async releaseHeld(
    legs: Types.ObjectId[],
    cabinClass: string,
    n: number,
  ): Promise<void> {
    for (const leg of legs) {
      await this.cabinModel.updateOne(
        {
          flight: leg,
          cabinClass: cabinClass as CabinClass,
          heldSeats: { $gte: n },
        },
        { $inc: { heldSeats: -n } },
      );
    }
  }

  private async convertHeldToBooked(
    legs: Types.ObjectId[],
    cabinClass: string,
    n: number,
  ): Promise<void> {
    for (const leg of legs) {
      await this.cabinModel.updateOne(
        {
          flight: leg,
          cabinClass: cabinClass as CabinClass,
          heldSeats: { $gte: n },
        },
        { $inc: { heldSeats: -n, bookedSeats: n } },
      );
    }
  }

  private async releaseBooked(
    legs: Types.ObjectId[],
    cabinClass: string,
    n: number,
  ): Promise<void> {
    for (const leg of legs) {
      await this.cabinModel.updateOne(
        {
          flight: leg,
          cabinClass: cabinClass as CabinClass,
          bookedSeats: { $gte: n },
        },
        { $inc: { bookedSeats: -n } },
      );
    }
  }

  private seatCount(
    passengers: { type?: string | null }[],
  ): number {
    return passengers.filter((p) => (p.type ?? 'adult') !== 'infant').length;
  }

  private legsOf(doc: FlightBookingDocument): Types.ObjectId[] {
    return doc.returnFlightId
      ? [doc.flightId, doc.returnFlightId]
      : [doc.flightId];
  }

  private async safely(fn: () => Promise<unknown>, what: string) {
    try {
      await fn();
    } catch (e) {
      this.logger.error(`Failed to ${what}`, e);
    }
  }

  // ---------- validation and pricing ----------

  private async loadLeg(flightId: string, cabinClass: string) {
    if (!Types.ObjectId.isValid(flightId)) {
      throw new NotFoundException('Flight not found');
    }
    const flight = await this.flightModel.findById(flightId);
    if (!flight) throw new NotFoundException('Flight not found');
    if (
      flight.status !== FlightStatus.SCHEDULED ||
      flight.departureTime <= new Date()
    ) {
      throw new ConflictException('This flight is not available for booking');
    }
    const cabin = await this.cabinModel.findOne({
      flight: flight._id,
      cabinClass: cabinClass as CabinClass,
    });
    if (!cabin) {
      throw new NotFoundException(`No ${cabinClass} cabin on this flight`);
    }
    return { flight, cabin };
  }

  /** Loads and validates flights, airline and baggage, and computes the total (FLT-19, FLT-21). */
  private async prepare(dto: CreateFlightBookingDto) {
    const out = await this.loadLeg(dto.flightId, dto.cabinClass);
    const ret = dto.returnFlightId
      ? await this.loadLeg(dto.returnFlightId, dto.cabinClass)
      : null;

    const airline = await this.airlineModel.findById(out.flight.airline);
    if (!airline) throw new NotFoundException('Airline not found');
    if (!airline.isActive) {
      throw new ConflictException('This airline is not available for booking');
    }
    if (ret) {
      if (String(ret.flight.airline) !== String(out.flight.airline)) {
        throw new BadRequestException(
          'Outbound and return flights must be on the same airline',
        );
      }
      if (ret.flight.departureTime <= out.flight.arrivalTime) {
        throw new BadRequestException(
          'The return flight must depart after the outbound flight arrives',
        );
      }
    }

    // FLT-08: extra bags per passenger and weight per bag are limited
    const maxBags = airline.maxExtraBags ?? 0;
    const bagCounts = dto.passengers.map((p) => p.extraBags?.length ?? 0);
    const totalBags = bagCounts.reduce((a, b) => a + b, 0);
    dto.passengers.forEach((p, i) => {
      if (bagCounts[i] > maxBags) {
        throw new BadRequestException(
          `Passenger ${i + 1} exceeds the maximum of ${maxBags} extra bag(s)`,
        );
      }
      for (const bag of p.extraBags ?? []) {
        if (bag.weightKg > out.cabin.maxBagWeightKg) {
          throw new BadRequestException(
            `An extra bag exceeds the maximum weight of ${out.cabin.maxBagWeightKg} kg`,
          );
        }
      }
    });
    if (totalBags > 0 && airline.extraBagPrice == null) {
      throw new BadRequestException(
        'This airline has no extra baggage price defined',
      );
    }

    const adultCount = dto.passengers.filter(
      (p) => (p.type ?? 'adult') === 'adult',
    ).length;
    const childCount = dto.passengers.filter((p) => p.type === 'child').length;
    const infantCount = dto.passengers.filter((p) => p.type === 'infant').length;
    if (adultCount < 1) {
      throw new BadRequestException('At least one adult passenger is required');
    }
    if (infantCount > adultCount) {
      throw new BadRequestException(
        'Each infant must be accompanied by an adult passenger',
      );
    }
    const seatCount = adultCount + childCount; // infants do not occupy a seat

    const legCount = ret ? 2 : 1;
    const baggageFee =
      calculateBaggageFee(
        bagCounts,
        airline.extraBagPrice != null
          ? {
              pricePerExtraBag: airline.extraBagPrice,
              maxExtraBagsPerPassenger: maxBags,
            }
          : null,
      ) * legCount;

    const farePerPassenger = out.cabin.price + (ret?.cabin.price ?? 0);
    // FLT-12: infants pay 10% of the fare and do not take a seat.
    const baseFare = round2(
      farePerPassenger * seatCount + farePerPassenger * 0.1 * infantCount,
    );
    const totalPrice = round2(baseFare + baggageFee);

    return {
      outbound: out.flight,
      inbound: ret?.flight ?? null,
      airline,
      lastArrival: ret ? ret.flight.arrivalTime : out.flight.arrivalTime,
      farePerPassenger,
      baseFare,
      baggageFee,
      totalPrice,
      seatCount,
    };
  }

  // ---------- helpers ----------

  private async findByIdOr404(
    bookingId: string,
  ): Promise<FlightBookingDocument> {
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
      departureTime: doc.departureTime ?? createdAt,
      arrivalTime: doc.arrivalTime ?? createdAt,
      totalPrice: doc.totalPrice,
      status: this.derivedStatus(doc, now),
      createdAt,
    };
  }
}