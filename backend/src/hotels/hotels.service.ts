import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, isValidObjectId, Model } from 'mongoose';
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

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type NightRange = { start: string; end: string }; // inclusive nights

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
  async updateHotel(
    hotelId: string,
    dto: UpdateHotelDto,
    user: AuthUser,
  ): Promise<HotelDocument> {
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
  async createRoom(
    hotelId: string,
    dto: CreateRoomDto,
    user: AuthUser,
  ): Promise<RoomDocument> {
    const hotel = await this.getHotelOrThrow(hotelId);
    this.assertCanManageHotel(user, hotel);

    try {
      return await this.roomModel.create({ ...dto, hotelId: hotel._id });
    } catch (err) {
      // 11000 = duplicate key -> roomNumber already used in this hotel
      if ((err as { code?: number })?.code === 11000) {
        throw new ConflictException(
          `Room "${dto.roomNumber}" already exists in this hotel`,
        );
      }
      throw err;
    }
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
  async findRoomsByIds(
    roomIds: string[],
    session?: ClientSession,
  ): Promise<RoomDocument[]> {
    if (!roomIds.every((id) => isValidObjectId(id))) {
      throw new BadRequestException('Invalid room id');
    }
    return this.roomModel
      .find({ _id: { $in: roomIds } })
      .session(session ?? null);
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

    const hotel = await this.hotelModel
      .findById(room.hotelId)
      .session(session ?? null);
    if (!hotel || !hotel.isActive) return false;

    // 4. Every night must be inside a bookable range
    if (!this.coversAllNights(room.availabilityRanges, firstNight, lastNight))
      return false;

    // 5. No night may touch a blocked range
    if (room.blockedRanges.some((r) => this.overlaps(r, firstNight, lastNight)))
      return false;

    // 6. Not taken by a Confirmed booking or an unexpired hold (member 6's data)
    const taken = await this.hotelBookingsService.getTakenRoomIds(
      [roomId],
      firstNight,
      lastNight,
      session,
    );
    return taken.length === 0;
  }

  // ---------------------------------------------------------------
  // For member 6 (HTL-23): they compute the numbers, we store them.
  // Works for deactivated hotels too (reviews of past stays).
  // ---------------------------------------------------------------
  async updateRating(
    hotelId: string,
    ratingAvg: number,
    ratingCount: number,
  ): Promise<void> {
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

  // ===============================================================
  // Helpers (private = only usable inside this class)
  // ===============================================================

  // Key-card check: admin, or the moderator assigned to THIS hotel (GEN-13)
  private assertCanManageHotel(user: AuthUser, hotel: HotelDocument): void {
    if (user.role === Role.Admin) return;
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

  // City must exist in the seeded reference data (GEN-12); returns its country code
  private async resolveCountryCode(cityId: string): Promise<string> {
    const city = await this.cityModel.findOne({ cityId }).lean();
    if (!city) {
      throw new BadRequestException(`Unknown cityId "${cityId}"`);
    }
    return city.countryCode;
  }

  // Two inclusive ranges overlap if each starts before the other ends
  private overlaps(range: NightRange, start: string, end: string): boolean {
    return range.start <= end && range.end >= start;
  }

  // Do the ranges (together) cover every night from start to end?
  private coversAllNights(
    ranges: NightRange[],
    start: string,
    end: string,
  ): boolean {
    let next = start; // first night not covered yet
    const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start));

    for (const r of sorted) {
      if (r.start > next) break; // gap before this range -> not covered
      if (r.end >= next) next = addDays(r.end, 1);
      if (next > end) return true; // passed the last night -> fully covered
    }
    return false;
  }
}
