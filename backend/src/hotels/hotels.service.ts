import {
  BadRequestException, ConflictException, ForbiddenException, Inject, Injectable,
  NotFoundException, forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, isValidObjectId, Model, Types } from 'mongoose';
import { HotelBookingsService } from '../hotel-bookings/hotel-bookings.service';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { City } from '../reference-data/schemas/city.schema';
import { Hotel, HotelDocument } from './schemas/hotel.schema';
import { Room, RoomDocument } from './schemas/room.schema';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { UpdateHotelPoliciesDto } from './dto/update-hotel-policies.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { DateRangeDto } from './dto/date-range.dto';
import { UpdateDateRangeDto } from './dto/update-date-range.dto';
import { SearchHotelsDto } from './dto/search-hotels.dto';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_VIEW_NIGHTS = 31; // status view is limited to 31 nights
const PAGE_SIZE = 10; // GEN-05

type NightRange = { start: string; end: string }; // inclusive nights
type StoredRange = NightRange & { _id: Types.ObjectId }; // a saved range has an _id
type RangeKind = 'available' | 'blocked';
type LeanRoom = Room & { _id: Types.ObjectId }; // a room read with .lean()

// "2026-11-10" + 1 -> "2026-11-11". UTC so time zones can't shift the date.
function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class HotelsService {
  constructor(
    @InjectModel(Hotel.name) private readonly hotelModel: Model<HotelDocument>,
    @InjectModel(Room.name) private readonly roomModel: Model<RoomDocument>,
    // From Mariam's global ReferenceDataModule
    @InjectModel(City.name) private readonly cityModel: Model<City>,
    // Circular dependency with hotel-bookings (agreed with member 6)
    @Inject(forwardRef(() => HotelBookingsService))
    private readonly hotelBookingsService: HotelBookingsService,
  ) {}

  // ===============================================================
  // HTL-01: admin creates a hotel
  // ===============================================================
  async createHotel(dto: CreateHotelDto): Promise<HotelDocument> {
    const countryCode = await this.resolveCountryCode(dto.cityId);
    return this.hotelModel.create({ ...dto, countryCode });
  }

  // ===============================================================
  // HTL-01: moderator edits their hotel's profile
  // ===============================================================
  async updateHotel(hotelId: string, dto: UpdateHotelDto, user: AuthUser): Promise<HotelDocument> {
    const hotel = await this.getHotelOrThrow(hotelId);
    this.assertCanManageHotel(user, hotel);

    const changes: Record<string, unknown> = { ...dto };
    if (dto.cityId) {
      // City changed -> country must follow it
      changes.countryCode = await this.resolveCountryCode(dto.cityId);
    }

    const updated = await this.hotelModel.findByIdAndUpdate(
      hotelId,
      { $set: changes },
      { new: true, runValidators: true },
    );
    return updated!; // exists: we just loaded it
  }

  // ===============================================================
  // HTL-09 + HTL-10: check-in/out times and cancellation tiers
  // ===============================================================
  async updatePolicies(
    hotelId: string,
    dto: UpdateHotelPoliciesDto,
    user: AuthUser,
  ): Promise<HotelDocument> {
    const hotel = await this.getHotelOrThrow(hotelId);
    this.assertCanManageHotel(user, hotel);

    const changes: Record<string, unknown> = {};
    if (dto.checkInTime !== undefined) changes.checkInTime = dto.checkInTime;
    if (dto.checkOutTime !== undefined) changes.checkOutTime = dto.checkOutTime;
    if (dto.cancellationTiers !== undefined) {
      // Store sorted (highest threshold first) so the refund rule is easy to apply later
      changes.cancellationTiers = [...dto.cancellationTiers].sort(
        (a, b) => b.daysBefore - a.daysBefore,
      );
    }

    const updated = await this.hotelModel.findByIdAndUpdate(
      hotelId,
      { $set: changes },
      { new: true, runValidators: true },
    );
    return updated!;
  }

  // ===============================================================
  // HTL-03: moderator adds a room to their hotel
  // ===============================================================
  async createRoom(hotelId: string, dto: CreateRoomDto, user: AuthUser): Promise<RoomDocument> {
    const hotel = await this.getHotelOrThrow(hotelId);
    this.assertCanManageHotel(user, hotel);

    try {
      return await this.roomModel.create({ ...dto, hotelId: hotel._id });
    } catch (err) {
      // 11000 = duplicate key -> roomNumber already used in this hotel
      if ((err as { code?: number })?.code === 11000) {
        throw new ConflictException(`Room "${dto.roomNumber}" already exists in this hotel`);
      }
      throw err;
    }
  }

  // ===============================================================
  // HTL-05 + HTL-06: moderator edits or deactivates a room
  // ===============================================================
  async updateRoom(
    hotelId: string,
    roomId: string,
    dto: UpdateRoomDto,
    user: AuthUser,
  ): Promise<RoomDocument> {
    const hotel = await this.getHotelOrThrow(hotelId);
    this.assertCanManageHotel(user, hotel);
    const room = await this.getRoomOrThrow(hotel, roomId);

    // Deactivating: rejected if any Confirmed / Pending Payment reservation
    // from today onwards uses this room (HTL-06)
    if (dto.isActive === false && room.isActive) {
      const busy = await this.hotelBookingsService.hasOverlappingReservation(
        roomId, todayUtc(), '9999-12-31',
      );
      if (busy) {
        throw new ConflictException(
          'Room has upcoming Confirmed or Pending Payment reservations and cannot be deactivated',
        );
      }
    }

    // Price changes don't affect existing reservations: bookings store their own price (HTL-05)
    const updated = await this.roomModel.findByIdAndUpdate(
      roomId,
      { $set: { ...dto } },
      { new: true, runValidators: true },
    );
    return updated!;
  }

  // ===============================================================
  // HTL-06: moderator deletes a room (only if never reserved)
  // ===============================================================
  async deleteRoom(hotelId: string, roomId: string, user: AuthUser): Promise<void> {
    const hotel = await this.getHotelOrThrow(hotelId);
    this.assertCanManageHotel(user, hotel);
    await this.getRoomOrThrow(hotel, roomId);

    if (await this.hotelBookingsService.wasEverReserved(roomId)) {
      throw new ConflictException(
        'Room has reservations and cannot be deleted. Deactivate it instead.',
      );
    }
    await this.roomModel.deleteOne({ _id: roomId });
  }

  // ===============================================================
  // HTL-04 + HTL-06: add an open or blocked range
  // ===============================================================
  async addRange(
    hotelId: string,
    roomId: string,
    dto: DateRangeDto,
    user: AuthUser,
  ): Promise<RoomDocument> {
    const hotel = await this.getHotelOrThrow(hotelId);
    this.assertCanManageHotel(user, hotel);
    await this.getRoomOrThrow(hotel, roomId);
    this.assertValidRange(dto.start, dto.end);

    // Blocking is rejected if a guest has these nights (Confirmed or on hold)
    if (dto.kind === 'blocked') {
      const busy = await this.hotelBookingsService.hasOverlappingReservation(
        roomId, dto.start, dto.end,
      );
      if (busy) {
        throw new ConflictException(
          'These nights have Confirmed or Pending Payment reservations and cannot be blocked',
        );
      }
    }

    // Check "no overlap with the same kind" and save in ONE atomic step
    const field = this.fieldFor(dto.kind);
    const filter: Record<string, unknown> = {
      _id: roomId,
      [field]: {
        $not: { $elemMatch: { start: { $lte: dto.end }, end: { $gte: dto.start } } },
      },
    };
    const update: Record<string, unknown> = {
      $push: { [field]: { start: dto.start, end: dto.end } },
    };
    const updated = await this.roomModel.findOneAndUpdate(filter, update, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      throw new ConflictException(`This range overlaps another ${dto.kind} range of this room`);
    }
    return updated;
  }

  // ===============================================================
  // HTL-05 + HTL-06: move or resize a range
  // ===============================================================
  async updateRange(
    hotelId: string,
    roomId: string,
    rangeId: string,
    dto: UpdateDateRangeDto,
    user: AuthUser,
  ): Promise<RoomDocument> {
    const hotel = await this.getHotelOrThrow(hotelId);
    this.assertCanManageHotel(user, hotel);
    const room = await this.getRoomOrThrow(hotel, roomId);
    const { kind, range } = this.findRange(room, rangeId);

    const start = dto.start ?? range.start;
    const end = dto.end ?? range.end;
    this.assertValidRange(start, end);

    // No overlap with the OTHER ranges of the same kind
    const others = this.rangesOf(room, kind).filter((r) => String(r._id) !== rangeId);
    if (others.some((r) => this.overlaps(r, start, end))) {
      throw new ConflictException(`This range overlaps another ${kind} range of this room`);
    }

    if (kind === 'available') {
      // Shrinking: nights that are no longer open must not have Confirmed reservations (HTL-05)
      for (const part of this.removedParts(range, { start, end })) {
        if (await this.hotelBookingsService.hasConfirmedReservations(roomId, part.start, part.end)) {
          throw new ConflictException(
            `Nights ${part.start} to ${part.end} have Confirmed reservations and must stay open`,
          );
        }
      }
    } else {
      // Blocking (possibly new) nights: no guest may have them (HTL-06)
      if (await this.hotelBookingsService.hasOverlappingReservation(roomId, start, end)) {
        throw new ConflictException(
          'These nights have Confirmed or Pending Payment reservations and cannot be blocked',
        );
      }
    }

    const field = this.fieldFor(kind);
    const update: Record<string, unknown> = {
      $set: { [`${field}.$.start`]: start, [`${field}.$.end`]: end },
    };
    const updated = await this.roomModel.findOneAndUpdate(
      { _id: roomId, [`${field}._id`]: rangeId } as Record<string, unknown>,
      update,
      { new: true, runValidators: true },
    );
    return updated!;
  }

  // ===============================================================
  // HTL-05 + HTL-06: remove a range
  // ===============================================================
  async removeRange(
    hotelId: string,
    roomId: string,
    rangeId: string,
    user: AuthUser,
  ): Promise<RoomDocument> {
    const hotel = await this.getHotelOrThrow(hotelId);
    this.assertCanManageHotel(user, hotel);
    const room = await this.getRoomOrThrow(hotel, roomId);
    const { kind, range } = this.findRange(room, rangeId);

    // Removing OPEN nights: rejected if any have Confirmed reservations (HTL-05).
    // Removing a BLOCK is always fine: it only makes nights sellable again.
    if (kind === 'available') {
      if (await this.hotelBookingsService.hasConfirmedReservations(roomId, range.start, range.end)) {
        throw new ConflictException(
          'This range has Confirmed reservations and cannot be removed',
        );
      }
    }

    const field = this.fieldFor(kind);
    const update: Record<string, unknown> = {
      $pull: { [field]: { _id: new Types.ObjectId(rangeId) } },
    };
    const updated = await this.roomModel.findByIdAndUpdate(roomId, update, { new: true });
    return updated!;
  }

  // ===============================================================
  // HTL-08: each room's status per night
  // ===============================================================
  async getAvailabilityView(hotelId: string, from: string, to: string, user: AuthUser) {
    const hotel = await this.getHotelOrThrow(hotelId);
    this.assertCanManageHotel(user, hotel);
    if (to < from) {
      throw new BadRequestException('"to" must be on or after "from"');
    }

    // List every night from "from" to "to" (inclusive), max 31
    const nights: string[] = [];
    for (let d = from; d <= to; d = addDays(d, 1)) {
      nights.push(d);
      if (nights.length > MAX_VIEW_NIGHTS) {
        throw new BadRequestException(`The range can be at most ${MAX_VIEW_NIGHTS} nights`);
      }
    }

    const rooms = await this.roomModel
      .find({ hotelId: hotel._id })
      .sort({ roomNumber: 1 })
      .lean();

    // Ask member 6 ONCE for every taken night in this hotel, then index by "roomId|date"
    const booked = await this.hotelBookingsService.getHotelBookedNights(hotelId, from, to);
    const bookedMap = new Map(booked.map((b) => [`${b.roomId}|${b.date}`, b]));

    return {
      hotelId,
      from,
      to,
      rooms: rooms.map((room) => ({
        roomId: String(room._id),
        roomNumber: room.roomNumber,
        type: room.type,
        isActive: room.isActive,
        nights: nights.map((date) => {
          const b = bookedMap.get(`${String(room._id)}|${date}`);
          if (b) {
            // Booked wins: a real guest matters more than a calendar mark
            return { date, status: 'Booked', reference: b.reference, bookingStatus: b.status };
          }
          if (this.containsNight(room.blockedRanges, date)) {
            return { date, status: 'Blocked' };
          }
          if (room.isActive && this.containsNight(room.availabilityRanges, date)) {
            return { date, status: 'Available' };
          }
          // Not open, or room deactivated: not sellable -> shown as Blocked
          return { date, status: 'Blocked' };
        }),
      })),
    };
  }

  // ===============================================================
  // HTL-11 + HTL-12: search hotels (public)
  // ===============================================================
  async searchHotels(q: SearchHotelsDto) {
    if (!q.cityId && !q.countryCode) {
      throw new BadRequestException('Please choose a city or a country.');
    }
    this.assertStayDates(q.checkIn, q.checkOut);
    if (q.minPrice !== undefined && q.maxPrice !== undefined && q.minPrice > q.maxPrice) {
      throw new BadRequestException('The minimum price cannot be higher than the maximum price.');
    }
    if (q.rooms > q.guests) {
      throw new BadRequestException('The number of rooms cannot be more than the number of guests.');
    }

    // 1. Active hotels in the city / country (+ rating filter: unrated hotels excluded)
    const filter: Record<string, unknown> = { isActive: true };
    if (q.cityId) filter.cityId = q.cityId;
    if (q.countryCode) filter.countryCode = q.countryCode;
    if (q.minRating !== undefined) {
      filter.ratingCount = { $gt: 0 };
      filter.ratingAvg = { $gte: q.minRating };
    }
    const hotels = await this.hotelModel.find(filter).lean();
    const page = q.page ?? 1;
    if (hotels.length === 0) {
      return { data: [], total: 0, page, limit: PAGE_SIZE };
    }

    // 2. Every free room of those hotels for the whole stay, grouped by hotel
    const free = await this.findFreeRooms(hotels.map((h) => h._id), q.checkIn, q.checkOut);
    const byHotel = new Map<string, LeanRoom[]>();
    for (const room of free) {
      const key = String(room.hotelId);
      byHotel.set(key, [...(byHotel.get(key) ?? []), room]);
    }

    // 3. Keep hotels with enough free rooms whose biggest rooms fit all guests
    const nights = this.nightCount(q.checkIn, q.checkOut);
    const results = hotels.flatMap((h) => {
      const rooms = byHotel.get(String(h._id)) ?? [];
      if (rooms.length < q.rooms) return [];

      const capacity = [...rooms]
        .sort((a, b) => b.maxOccupancy - a.maxOccupancy)
        .slice(0, q.rooms)
        .reduce((sum, r) => sum + r.maxOccupancy, 0);
      if (capacity < q.guests) return [];

      // HTL-12: price = the hotel's cheapest free room
      const cheapest = Math.min(...rooms.map((r) => r.pricePerNight));
      if (q.minPrice !== undefined && cheapest < q.minPrice) return [];
      if (q.maxPrice !== undefined && cheapest > q.maxPrice) return [];

      return [{
        hotelId: String(h._id),
        name: h.name,
        address: h.address,
        cityId: h.cityId,
        countryCode: h.countryCode,
        starClass: h.starClass,
        photos: h.photos,
        amenities: h.amenities,
        ratingAvg: h.ratingAvg,
        ratingCount: h.ratingCount,
        cheapestPricePerNight: cheapest,
        freeRooms: rooms.length,
        nights,
      }];
    });

    // 4. Sort (price: cheapest first by default; rating: best first by default)
    const sortBy = q.sortBy ?? 'price';
    const order = q.order ?? (sortBy === 'rating' ? 'desc' : 'asc');
    const direction = order === 'asc' ? 1 : -1;
    const value = (r: (typeof results)[number]) =>
      sortBy === 'price' ? r.cheapestPricePerNight : r.ratingAvg;
    results.sort((a, b) => (value(a) - value(b)) * direction);

    // 5. Page of 10 (GEN-05)
    const start = (page - 1) * PAGE_SIZE;
    return {
      data: results.slice(start, start + PAGE_SIZE),
      total: results.length,
      page,
      limit: PAGE_SIZE,
    };
  }

  // ===============================================================
  // HTL-15: free rooms of one hotel for a stay, with the total price (public)
  // ===============================================================
  async getAvailableRooms(hotelId: string, checkIn: string, checkOut: string) {
    const hotel = await this.findHotelById(hotelId); // 404 for missing / deactivated
    this.assertStayDates(checkIn, checkOut);

    const nights = this.nightCount(checkIn, checkOut);
    const free = await this.findFreeRooms([hotel._id], checkIn, checkOut);

    return {
      hotelId: String(hotel._id),
      checkIn,
      checkOut,
      nights,
      rooms: free
        .sort((a, b) => a.pricePerNight - b.pricePerNight)
        .map((r) => ({
          roomId: String(r._id),
          roomNumber: r.roomNumber,
          type: r.type,
          beds: r.beds,
          maxOccupancy: r.maxOccupancy,
          pricePerNight: r.pricePerNight,
          totalPrice: this.round2(nights * r.pricePerNight),
        })),
    };
  }

  // ===============================================================
  // HTL-02: hotel details, plus available rooms when dates are given (public)
  // ===============================================================
  async getHotelDetails(hotelId: string, checkIn?: string, checkOut?: string) {
    const hotel = await this.findHotelById(hotelId);
    if (!checkIn && !checkOut) return hotel;
    if (!checkIn || !checkOut) {
      throw new BadRequestException('Please give both a check-in and a check-out date.');
    }
    const { nights, rooms } = await this.getAvailableRooms(hotelId, checkIn, checkOut);
    return { ...hotel.toObject(), checkIn, checkOut, nights, availableRooms: rooms };
  }

  // ---------------------------------------------------------------
  // HTL-02: view a hotel's details (also used by member 6)
  // ---------------------------------------------------------------
  async findHotelById(hotelId: string): Promise<HotelDocument> {
    if (!isValidObjectId(hotelId)) {
      throw new BadRequestException('Invalid hotel id');
    }
    const hotel = await this.hotelModel.findById(hotelId);
    // Deactivated hotels are hidden from the public
    if (!hotel || !hotel.isActive) {
      throw new NotFoundException('Hotel not found');
    }
    return hotel;
  }

  // ---------------------------------------------------------------
  // For member 6: load several rooms at once (works inside their transaction)
  // ---------------------------------------------------------------
  async findRoomsByIds(roomIds: string[], session?: ClientSession): Promise<RoomDocument[]> {
    if (!roomIds.every((id) => isValidObjectId(id))) {
      throw new BadRequestException('Invalid room id');
    }
    return this.roomModel.find({ _id: { $in: roomIds } }).session(session ?? null);
  }

  // ---------------------------------------------------------------
  // For member 6 (booking) and for search: is this room free for the stay?
  // checkIn / checkOut are STAY dates (checkOut = departure day).
  // ---------------------------------------------------------------
  async checkRoomAvailability(
    roomId: string,
    checkIn: string,
    checkOut: string,
    session?: ClientSession,
  ): Promise<boolean> {
    // 1. The request itself must make sense (these are errors, not "unavailable")
    if (!isValidObjectId(roomId)) {
      throw new BadRequestException('Invalid room id');
    }
    if (!DATE_REGEX.test(checkIn) || !DATE_REGEX.test(checkOut)) {
      throw new BadRequestException('Dates must be YYYY-MM-DD');
    }
    if (checkOut <= checkIn) {
      throw new BadRequestException('Check-out must be after check-in');
    }
    if (checkIn < todayUtc()) {
      throw new BadRequestException('Check-in cannot be in the past');
    }

    // 2. Stay -> inclusive nights
    const firstNight = checkIn;
    const lastNight = addDays(checkOut, -1);

    // 3. Room and hotel must exist and be active
    const room = await this.roomModel.findById(roomId).session(session ?? null);
    if (!room || !room.isActive) return false;

    const hotel = await this.hotelModel.findById(room.hotelId).session(session ?? null);
    if (!hotel || !hotel.isActive) return false;

    // 4. Every night must be inside a bookable range
    if (!this.coversAllNights(room.availabilityRanges, firstNight, lastNight)) return false;

    // 5. No night may touch a blocked range
    if (room.blockedRanges.some((r) => this.overlaps(r, firstNight, lastNight))) return false;

    // 6. Not taken by a Confirmed booking or an unexpired hold (member 6's data)
    const taken = await this.hotelBookingsService.getTakenRoomIds(
      [roomId], firstNight, lastNight, session,
    );
    return taken.length === 0;
  }

  // ---------------------------------------------------------------
  // For member 6 (HTL-23): they compute the numbers, we store them.
  // Works for deactivated hotels too (reviews of past stays).
  // ---------------------------------------------------------------
  async updateRating(hotelId: string, ratingAvg: number, ratingCount: number): Promise<void> {
    if (!isValidObjectId(hotelId)) {
      throw new BadRequestException('Invalid hotel id');
    }
    const result = await this.hotelModel.updateOne(
      { _id: hotelId },
      { $set: { ratingAvg, ratingCount } },
    );
    if (result.matchedCount === 0) {
      throw new NotFoundException('Hotel not found');
    }
  }

  // ---------------------------------------------------------------
  // ACC-15: admin deactivates / reactivates a hotel (called by the admin module).
  // Existing Confirmed bookings stay valid; the hotel is just hidden and unbookable.
  // ---------------------------------------------------------------
  async setHotelActive(hotelId: string, isActive: boolean): Promise<HotelDocument> {
    if (!isValidObjectId(hotelId)) {
      throw new BadRequestException('Invalid hotel id');
    }
    const hotel = await this.hotelModel.findByIdAndUpdate(
      hotelId,
      { $set: { isActive } },
      { new: true },
    );
    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }
    return hotel;
  }

  // ===============================================================
  // Helpers (private = only usable inside this class)
  // ===============================================================

  // Key-card check: admin, or the moderator assigned to THIS hotel (GEN-13)
 private assertCanManageHotel(user: AuthUser, hotel: HotelDocument): void {
    if (
      user.role === Role.HotelModerator &&
      user.assignedProviderId === hotel._id.toString()
    ) {
      return;
    }
    throw new ForbiddenException('You can only manage your own hotel');
  }

  // Like findHotelById, but INCLUDES deactivated hotels (for moderators/admins)
  private async getHotelOrThrow(hotelId: string): Promise<HotelDocument> {
    if (!isValidObjectId(hotelId)) {
      throw new BadRequestException('Invalid hotel id');
    }
    const hotel = await this.hotelModel.findById(hotelId);
    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }
    return hotel;
  }

  // Room must exist AND belong to this hotel
  // (stops a moderator editing another hotel's room through their own hotel's URL)
  private async getRoomOrThrow(hotel: HotelDocument, roomId: string): Promise<RoomDocument> {
    if (!isValidObjectId(roomId)) {
      throw new BadRequestException('Invalid room id');
    }
    const room = await this.roomModel.findOne({ _id: roomId, hotelId: hotel._id });
    if (!room) {
      throw new NotFoundException('Room not found in this hotel');
    }
    return room;
  }

  // City must exist in the seeded reference data (GEN-12); returns its country code
  private async resolveCountryCode(cityId: string): Promise<string> {
    const city = await this.cityModel.findOne({ cityId }).lean();
    if (!city) {
      throw new BadRequestException(`Unknown cityId "${cityId}"`);
    }
    return city.countryCode;
  }

  // Calendar ranges: start <= end, and not entirely in the past
  private assertValidRange(start: string, end: string): void {
    if (end < start) {
      throw new BadRequestException('The end date must be on or after the start date.');
    }
    if (end < todayUtc()) {
      throw new BadRequestException(
        'These dates are in the past. Please choose dates from today onwards.',
      );
    }
  }

  // Which list a kind is stored in
  private fieldFor(kind: RangeKind): 'availabilityRanges' | 'blockedRanges' {
    return kind === 'available' ? 'availabilityRanges' : 'blockedRanges';
  }

  // The saved ranges of one kind, with their _id
  private rangesOf(room: RoomDocument, kind: RangeKind): StoredRange[] {
    return room[this.fieldFor(kind)] as unknown as StoredRange[];
  }

  // Find a range by id in either list -> tells us its kind
  private findRange(room: RoomDocument, rangeId: string): { kind: RangeKind; range: StoredRange } {
    if (!isValidObjectId(rangeId)) {
      throw new BadRequestException('Invalid range id');
    }
    for (const kind of ['available', 'blocked'] as const) {
      const range = this.rangesOf(room, kind).find((r) => String(r._id) === rangeId);
      if (range) return { kind, range };
    }
    throw new NotFoundException('Range not found for this room');
  }

  // Nights in "old" that are NOT in "next" (up to 2 pieces: left and right)
  private removedParts(old: NightRange, next: NightRange): NightRange[] {
    const parts: NightRange[] = [];
    if (old.start < next.start) {
      const end = addDays(next.start, -1) < old.end ? addDays(next.start, -1) : old.end;
      parts.push({ start: old.start, end });
    }
    if (old.end > next.end) {
      const start = addDays(next.end, 1) > old.start ? addDays(next.end, 1) : old.start;
      parts.push({ start, end: old.end });
    }
    return parts;
  }

  // Is this one night inside any of the ranges?
  private containsNight(ranges: NightRange[], date: string): boolean {
    return ranges.some((r) => r.start <= date && date <= r.end);
  }

  // Two inclusive ranges overlap if each starts before the other ends
  private overlaps(range: NightRange, start: string, end: string): boolean {
    return range.start <= end && range.end >= start;
  }

  // Do the ranges (together) cover every night from start to end?
  private coversAllNights(ranges: NightRange[], start: string, end: string): boolean {
    let next = start; // first night not covered yet
    const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start));

    for (const r of sorted) {
      if (r.start > next) break;             // gap before this range -> not covered
      if (r.end >= next) next = addDays(r.end, 1);
      if (next > end) return true;           // passed the last night -> fully covered
    }
    return false;
  }

  // Search + free-rooms list: active rooms of these hotels that are open every
  // night, not blocked, and not taken (Confirmed or unexpired hold)
  private async findFreeRooms(
    hotelIds: Types.ObjectId[],
    checkIn: string,
    checkOut: string,
  ): Promise<LeanRoom[]> {
    const firstNight = checkIn;
    const lastNight = addDays(checkOut, -1);

    const rooms = (await this.roomModel
      .find({ hotelId: { $in: hotelIds }, isActive: true })
      .lean()) as unknown as LeanRoom[];

    const candidates = rooms.filter(
      (r) =>
        this.coversAllNights(r.availabilityRanges, firstNight, lastNight) &&
        !r.blockedRanges.some((b) => this.overlaps(b, firstNight, lastNight)),
    );
    if (candidates.length === 0) return [];

    // Ask member 6 ONCE for all candidate rooms
    const taken = new Set(
      await this.hotelBookingsService.getTakenRoomIds(
        candidates.map((r) => String(r._id)),
        firstNight,
        lastNight,
      ),
    );
    return candidates.filter((r) => !taken.has(String(r._id)));
  }

  // HTL-11: check-out after check-in, check-in not in the past
  private assertStayDates(checkIn: string, checkOut: string): void {
    if (checkOut <= checkIn) {
      throw new BadRequestException('The check-out date must be after the check-in date.');
    }
    if (checkIn < todayUtc()) {
      throw new BadRequestException('The check-in date cannot be in the past.');
    }
  }

  // Number of nights in a stay ("2026-12-20" -> "2026-12-23" = 3)
  private nightCount(checkIn: string, checkOut: string): number {
    return Math.round(
      (Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86_400_000,
    );
  }

  // Money: round to 2 decimals
  private round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }
}