import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { CreateHotelBookingDto } from './dto/create-hotel-booking.dto';
import {
  BookingGroup,
  ListBookingsQueryDto,
  ListReservationsQueryDto,
} from './dto/queries.dto';
import { diffDays, isValidDateString, nightsBetween, round2, todayString } from './date.util';
import {
  BookingStatus,
  HOLD_MINUTES,
  PAGE_SIZE,
  RoomNightStatus,
} from './hotel-booking.constants';
import { HotelsService } from '../hotels/hotels.service';
import { HotelBooking, HotelBookingDocument } from './schemas/hotel-booking.schema';
import { RoomNight, RoomNightDocument } from './schemas/room-night.schema';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));
const isDuplicateKey = (e: unknown) => (e as { code?: number })?.code === 11000;

@Injectable()
export class HotelBookingsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HotelBookingsService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectModel(HotelBooking.name) private readonly bookingModel: Model<HotelBookingDocument>,
    @InjectModel(RoomNight.name) private readonly roomNightModel: Model<RoomNightDocument>,
    @InjectConnection() private readonly connection: Connection,
    // circular with HotelsService (it calls our helpers): forwardRef on both sides
    @Inject(forwardRef(() => HotelsService)) private readonly hotels: HotelsService,
  ) {}

  // ---- hold expiry job (HTL-18) ----
  onModuleInit() {
    this.timer = setInterval(() => {
      this.expireStaleHolds().catch((e) => this.logger.error('expireStaleHolds failed', e));
    }, 60_000);
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** PendingPayment past its hold -> Expired, rooms released. */
  async expireStaleHolds(): Promise<number> {
    const stale = await this.bookingModel
      .find({ status: BookingStatus.PendingPayment, holdExpiresAt: { $lt: new Date() } })
      .select('_id');
    if (!stale.length) return 0;
    const ids = stale.map((b) => b._id);
    await this.bookingModel.updateMany(
      { _id: { $in: ids }, status: BookingStatus.PendingPayment },
      { $set: { status: BookingStatus.Expired } },
    );
    await this.roomNightModel.deleteMany({ bookingId: { $in: ids }, status: RoomNightStatus.Held });
    // TODO(member 7): cancel the Stripe PaymentIntent for each expired booking (PAY-01)
    return ids.length;
  }

  // ---- HTL-16 + HTL-18: create reservation and hold all rooms atomically ----
  async create(userId: string, dto: CreateHotelBookingDto) {
    const { checkIn, checkOut } = dto;
    this.assertStayDates(checkIn, checkOut);

    const guests = dto.rooms.map((r) => ({
      roomId: r.roomId.toLowerCase(), // ObjectId strings are compared in lowercase
      adults: r.adults,
      childrenAges: r.childrenAges ?? [],
    }));
    const roomIds = guests.map((g) => g.roomId);
    if (new Set(roomIds).size !== roomIds.length) {
      throw new BadRequestException('The same room cannot be selected twice');
    }
    if (guests.reduce((sum, g) => sum + g.adults, 0) < 1) {
      throw new BadRequestException('A reservation needs at least one adult');
    }

    const hotel = await this.hotels.findHotelById(dto.hotelId);
    if (!hotel) throw new NotFoundException('Hotel not found');
    if (!hotel.isActive) throw new ConflictException('Hotel is not available for booking');

    const rooms = await this.hotels.findRoomsByIds(roomIds);
    const byId = new Map(rooms.map((r) => [String(r._id), r]));

    const nights = nightsBetween(checkIn, checkOut);
    const nightCount = nights.length;

    const bookedRooms = guests.map((g) => {
      const room = byId.get(g.roomId);
      if (!room) throw new NotFoundException(`Room ${g.roomId} not found`);
      if (String(room.hotelId) !== String(hotel._id)) {
        throw new BadRequestException('All rooms must belong to the same hotel');
      }
      const headcount = g.adults + g.childrenAges.length;
      if (headcount < 1) {
        throw new BadRequestException(`Room ${room.roomNumber} needs at least one guest`);
      }
      if (headcount > room.maxOccupancy) {
        throw new BadRequestException(
          `Room ${room.roomNumber} allows at most ${room.maxOccupancy} guests`,
        );
      }
      return {
        roomId: room._id,
        roomNumber: room.roomNumber,
        roomType: room.type,
        pricePerNight: room.pricePerNight,
        adults: g.adults,
        childrenAges: g.childrenAges,
      };
    });

    const totalPrice = round2(
      bookedRooms.reduce((sum, r) => sum + nightCount * r.pricePerNight, 0),
    );
    const now = new Date();
    const holdExpiresAt = new Date(now.getTime() + HOLD_MINUTES * 60_000);

    try {
      const booking = await this.connection.transaction(async (session) => {
        // free stale holds on these nights (TTL-free cleanup, keeps unique index usable)
        await this.roomNightModel.deleteMany(
          {
            roomId: { $in: bookedRooms.map((r) => r.roomId) },
            date: { $in: nights },
            status: RoomNightStatus.Held,
            holdExpiresAt: { $lte: now },
          },
          { session },
        );

        // all-or-nothing: first failing room rejects the whole request
        for (const r of bookedRooms) {
          const ok = await this.hotels.checkRoomAvailability(
            String(r.roomId),
            checkIn,
            checkOut, // stay dates; HotelsService converts to inclusive nights
            session,
          );
          if (!ok) {
            throw new ConflictException({
              message: `Room ${r.roomNumber} is not available for the requested stay`,
              roomId: String(r.roomId),
            });
          }
        }

        const [created] = await this.bookingModel.create(
          [
            {
              userId: oid(userId),
              hotelId: hotel._id,
              hotelName: hotel.name,
              checkIn,
              checkOut,
              nights: nightCount,
              rooms: bookedRooms,
              totalPrice,
              status: BookingStatus.PendingPayment,
              holdExpiresAt,
              cancellationTiers: (hotel.cancellationTiers ?? []).map((t) => ({
                daysBefore: t.daysBefore,
                refundPercent: t.refundPercent,
              })),
              checkInTime: hotel.checkInTime,
              checkOutTime: hotel.checkOutTime,
            },
          ],
          { session },
        );

        // unique (roomId, date) index is the real concurrency guard
        await this.roomNightModel.insertMany(
          bookedRooms.flatMap((r) =>
            nights.map((date) => ({
              roomId: r.roomId,
              hotelId: hotel._id,
              bookingId: created._id,
              date,
              status: RoomNightStatus.Held,
              holdExpiresAt,
            })),
          ),
          { session },
        );
        return created;
      });
      return this.toView(booking);
    } catch (e) {
      if (isDuplicateKey(e)) {
        throw new ConflictException('One of the rooms was just booked by someone else');
      }
      throw e;
    }
  }

  // ---- HTL-17: called by payments (member 7) after the Stripe webhook is verified ----
  async confirmBooking(bookingId: string, paymentId?: string) {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) throw new NotFoundException('Reservation not found');
    if (booking.status === BookingStatus.Confirmed) return this.toView(booking); // webhook retry
    if (booking.status !== BookingStatus.PendingPayment) {
      throw new ConflictException(`Cannot confirm a ${booking.status} reservation`);
    }
    if (!booking.holdExpiresAt || booking.holdExpiresAt < new Date()) {
      // TODO(member 7): payment succeeded after the hold expired -> refund it
      throw new ConflictException('The hold on this reservation has expired');
    }
    await this.connection.transaction(async (session) => {
      booking.status = BookingStatus.Confirmed;
      booking.reference = `HB-${randomBytes(4).toString('hex').toUpperCase()}`;
      booking.holdExpiresAt = null;
      if (paymentId) booking.paymentId = paymentId;
      await booking.save({ session });
      await this.roomNightModel.updateMany(
        { bookingId: booking._id },
        { $set: { status: RoomNightStatus.Confirmed, holdExpiresAt: null } },
        { session },
      );
    });
    // TODO(member 7): create in-app notification with reservation details (GEN-01)
    return this.toView(booking);
  }

  /** Used by payments when a payment fails/expires before confirmation. */
  async expireBooking(bookingId: string) {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking || booking.status !== BookingStatus.PendingPayment) return;
    booking.status = BookingStatus.Expired;
    await booking.save();
    await this.roomNightModel.deleteMany({ bookingId: booking._id });
  }

  /** PAY-02: payments stores policy acceptance on the reservation. */
  async markPoliciesAccepted(bookingId: string, userId: string) {
    const booking = await this.findOwned(userId, bookingId);
    booking.policiesAcceptedAt = new Date();
    await booking.save();
    return this.toView(booking);
  }

  // ---- HTL-20 ----
  async list(userId: string, query: ListBookingsQueryDto) {
    const today = todayString();
    const filter: Record<string, unknown> = { userId: oid(userId) };
    switch (query.group) {
      case BookingGroup.Upcoming:
        filter.$or = [
          { status: BookingStatus.Confirmed, checkOut: { $gte: today } },
          { status: BookingStatus.PendingPayment, holdExpiresAt: { $gt: new Date() } },
        ];
        break;
      case BookingGroup.Past:
        filter.status = BookingStatus.Confirmed;
        filter.checkOut = { $lt: today };
        break;
      case BookingGroup.Cancelled:
        filter.status = BookingStatus.Cancelled;
        break;
      default:
        filter.status = { $ne: BookingStatus.Expired };
    }
    return this.paginate(filter, query.page ?? 1);
  }

  async getOne(userId: string, id: string) {
    return this.toView(await this.findOwned(userId, id));
  }

  // ---- HTL-21 ----
  async cancellationQuote(userId: string, id: string) {
    const booking = await this.findOwned(userId, id);
    this.assertCancellable(booking);
    return this.computeRefund(booking);
  }

  async cancel(userId: string, id: string) {
    const booking = await this.findOwned(userId, id);
    this.assertCancellable(booking);
    const refund = this.computeRefund(booking);

    await this.connection.transaction(async (session) => {
      booking.status = BookingStatus.Cancelled;
      booking.cancelledAt = new Date();
      booking.refundPercent = refund.refundPercent;
      booking.refundAmount = refund.refundAmount;
      await booking.save({ session });
      await this.roomNightModel.deleteMany({ bookingId: booking._id }, { session });
    });
    // TODO(member 7): if refund.refundAmount > 0 create the Stripe refund (PAY-03) and
    // set booking.refundId; send cancellation/refund notification (GEN-01)
    return { booking: this.toView(booking), refund };
  }

  // ---- HTL-22: moderator view (TODO guard: moderator's own hotel only) ----
  async listForHotel(hotelId: string, query: ListReservationsQueryDto) {
    const filter: Record<string, unknown> = { hotelId: oid(hotelId) };
    if (query.status) filter.status = query.status;
    return this.paginate(filter, query.page ?? 1, 'userId hotelName checkIn checkOut status reference totalPrice rooms');
  }

  // ---- helpers other modules call ----
  // Conventions: roomId/hotelId = 24-hex strings; start/end = "YYYY-MM-DD" NIGHTS, both inclusive
  // (last night of a stay = checkOut - 1 day). Every helper accepts an optional Mongo session.
  // "Taken" = Confirmed, or Pending Payment with an unexpired hold.

  private takenFilter() {
    return {
      $or: [
        { status: RoomNightStatus.Confirmed },
        { status: RoomNightStatus.Held, holdExpiresAt: { $gt: new Date() } },
      ],
    };
  }

  /** ACC-12 (Mariam): block account deactivation with upcoming Confirmed bookings. */
  async hasUpcomingConfirmedBookings(userId: string, session?: ClientSession): Promise<boolean> {
    return !!(await this.bookingModel
      .exists({
        userId: oid(userId),
        status: BookingStatus.Confirmed,
        checkOut: { $gte: todayString() },
      })
      .session(session ?? null));
  }

  /** HTL-06: Confirmed or unexpired Pending Payment overlaps the nights. */
  async hasOverlappingReservation(
    roomId: string,
    start: string,
    end: string,
    session?: ClientSession,
  ): Promise<boolean> {
    return !!(await this.roomNightModel
      .exists({ roomId: oid(roomId), date: { $gte: start, $lte: end }, ...this.takenFilter() })
      .session(session ?? null));
  }

  /** HTL-05: availability can't be removed on dates with Confirmed reservations. */
  async hasConfirmedReservations(
    roomId: string,
    start: string,
    end: string,
    session?: ClientSession,
  ): Promise<boolean> {
    return !!(await this.roomNightModel
      .exists({
        roomId: oid(roomId),
        date: { $gte: start, $lte: end },
        status: RoomNightStatus.Confirmed,
      })
      .session(session ?? null));
  }

  /**
   * HTL-06: deletion allowed only for rooms never reserved.
   * Counts Confirmed and Cancelled reservations and unexpired Pending Payment holds;
   * Expired holds (and Pending ones past their hold time) do NOT count.
   */
  async wasEverReserved(roomId: string, session?: ClientSession): Promise<boolean> {
    return !!(await this.bookingModel
      .exists({
        'rooms.roomId': oid(roomId),
        $or: [
          { status: { $in: [BookingStatus.Confirmed, BookingStatus.Cancelled] } },
          { status: BookingStatus.PendingPayment, holdExpiresAt: { $gt: new Date() } },
        ],
      })
      .session(session ?? null));
  }

  /** HTL-11/15 bulk: which of these rooms have ANY taken night in [start,end]. */
  async getTakenRoomIds(
    roomIds: string[],
    start: string,
    end: string,
    session?: ClientSession,
  ): Promise<string[]> {
    if (!roomIds.length) return [];
    // aggregate + $group instead of distinct(): distinct is not allowed inside transactions,
    // and HotelsService.checkRoomAvailability calls this with our transaction session.
    const rows = await this.roomNightModel
      .aggregate<{ _id: Types.ObjectId }>([
        {
          $match: {
            roomId: { $in: roomIds.map(oid) },
            date: { $gte: start, $lte: end },
            ...this.takenFilter(),
          },
        },
        { $group: { _id: '$roomId' } },
      ])
      .session(session ?? null);
    return rows.map((r) => String(r._id));
  }

  /** HTL-08: taken nights of ONE room + reservation reference. */
  async getBookedNights(roomId: string, start: string, end: string, session?: ClientSession) {
    return this.bookedNights({ roomId: oid(roomId) }, start, end, session);
  }

  /** Same shape for every room of a hotel in one query. */
  async getHotelBookedNights(hotelId: string, start: string, end: string, session?: ClientSession) {
    return this.bookedNights({ hotelId: oid(hotelId) }, start, end, session);
  }

  private async bookedNights(
    scope: Record<string, unknown>,
    start: string,
    end: string,
    session?: ClientSession,
  ) {
    const nights = await this.roomNightModel
      .find({ ...scope, date: { $gte: start, $lte: end }, ...this.takenFilter() })
      .sort({ date: 1 })
      .session(session ?? null)
      .lean();
    const bookings = await this.bookingModel
      .find({ _id: { $in: [...new Set(nights.map((n) => String(n.bookingId)))].map(oid) } })
      .select('reference')
      .session(session ?? null)
      .lean();
    const refs = new Map(bookings.map((b) => [String(b._id), b.reference ?? null]));
    return nights.map((n) => ({
      roomId: String(n.roomId),
      date: n.date,
      status: n.status === RoomNightStatus.Confirmed ? 'Confirmed' : 'PendingPayment',
      bookingId: String(n.bookingId),
      reference: refs.get(String(n.bookingId)) ?? null, // null while PendingPayment
    }));
  }

  // ---- private ----
  private assertStayDates(checkIn: string, checkOut: string) {
    if (!isValidDateString(checkIn) || !isValidDateString(checkOut)) {
      throw new BadRequestException('Dates must be valid YYYY-MM-DD values');
    }
    if (checkOut <= checkIn) throw new BadRequestException('Check-out must be after check-in');
    if (checkIn < todayString()) throw new BadRequestException('Check-in cannot be in the past');
  }

  private assertCancellable(b: HotelBookingDocument) {
    if (b.status !== BookingStatus.Confirmed) {
      throw new BadRequestException('Only Confirmed reservations can be cancelled');
    }
    if (b.checkIn <= todayString()) {
      throw new BadRequestException('Reservations can only be cancelled before the check-in date');
    }
  }

  /** Same selection rule as FLT-09: tier with the highest threshold <= days remaining, else 0%. */
  private computeRefund(b: HotelBookingDocument) {
    const daysRemaining = diffDays(todayString(), b.checkIn);
    const tier = [...b.cancellationTiers]
      .filter((t) => t.daysBefore <= daysRemaining)
      .sort((a, c) => c.daysBefore - a.daysBefore)[0];
    const refundPercent = tier?.refundPercent ?? 0;
    return {
      daysRemaining,
      refundPercent,
      refundAmount: round2((b.totalPrice * refundPercent) / 100),
      totalPrice: b.totalPrice,
    };
  }

  private async findOwned(userId: string, id: string) {
    const booking = await this.bookingModel.findOne({ _id: oid(id), userId: oid(userId) });
    if (!booking) throw new NotFoundException('Reservation not found'); // 404 hides other users' bookings
    return booking;
  }

  private async paginate(filter: Record<string, unknown>, page: number, select?: string) {
    const q = this.bookingModel.find(filter).sort({ createdAt: -1 });
    if (select) q.select(select);
    const [docs, total] = await Promise.all([
      q.skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE),
      this.bookingModel.countDocuments(filter),
    ]);
    return { data: docs.map((d) => this.toView(d)), total, page, limit: PAGE_SIZE };
  }

  /** "Completed" is derived: Confirmed and check-out date has passed (HTL-23). */
  private toView(b: HotelBookingDocument) {
    const o = b.toObject();
    const completed = o.status === BookingStatus.Confirmed && o.checkOut < todayString();
    return { ...o, status: completed ? 'Completed' : o.status };
  }
}
