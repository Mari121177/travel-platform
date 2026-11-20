import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cabin, CabinDocument } from '../flights/cabin.schema';
import { Flight, FlightDocument } from '../flights/flight.schema';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { FlightBookingStatus } from './enums/flight-booking-status.enum';
import { PAGE_SIZE } from './flight-booking.constants';
import {
  FlightBooking,
  FlightBookingDocument,
} from './schemas/flight-booking.schema';

@Injectable()
export class FlightPassengersService {
  constructor(
    @InjectModel(FlightBooking.name)
    private readonly bookingModel: Model<FlightBookingDocument>,
    @InjectModel(Flight.name)
    private readonly flightModel: Model<FlightDocument>,
    @InjectModel(Cabin.name)
    private readonly cabinModel: Model<CabinDocument>,
  ) {}

  /** The moderator may only see flights of their own airline (checked in the backend). */
  private async assertOwnFlight(user: AuthUser, flightId: string) {
    if (!Types.ObjectId.isValid(flightId)) {
      throw new NotFoundException('Flight not found');
    }
    const flight = await this.flightModel.findById(flightId);
    if (!flight) throw new NotFoundException('Flight not found');
    if (user.assignedProviderId !== String(flight.airline)) {
      throw new ForbiddenException('This flight belongs to another airline');
    }
    return new Types.ObjectId(flightId);
  }

  private matchFor(id: Types.ObjectId) {
    return {
      $or: [{ flightId: id }, { returnFlightId: id }],
      status: {
        $in: [FlightBookingStatus.Confirmed, FlightBookingStatus.Cancelled],
      },
    };
  }

  /** FLT-29: bookings of one flight + seats remaining per cabin. */
  async listBookings(user: AuthUser, flightId: string, page = 1) {
    const id = await this.assertOwnFlight(user, flightId);
    const match = this.matchFor(id);

    const [docs, total, cabins] = await Promise.all([
      this.bookingModel
        .find(match)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE),
      this.bookingModel.countDocuments(match),
      this.cabinModel.find({ flight: id }),
    ]);

    return {
      seatsRemaining: cabins.map((c) => ({
        cabinClass: c.cabinClass,
        totalSeats: c.totalSeats,
        remaining: c.totalSeats - c.bookedSeats - c.heldSeats,
      })),
      data: docs.map((b) => ({
        bookingId: String(b._id),
        reference: b.reference ?? null,
        passengers: b.passengers.map((p) => p.fullName),
        cabinClass: b.cabinClass,
        seats: b.passengers.length,
        status: b.status,
      })),
      total,
      page,
      limit: PAGE_SIZE,
    };
  }

  /** FLT-29: passenger list as CSV. */
  async exportCsv(user: AuthUser, flightId: string): Promise<string> {
    const id = await this.assertOwnFlight(user, flightId);
    const docs = await this.bookingModel
      .find(this.matchFor(id))
      .sort({ createdAt: 1, _id: 1 });

    const rows: string[][] = [
      [
        'Reference',
        'Passenger',
        'Date of birth',
        'ID/Passport',
        'Cabin',
        'Status',
      ],
    ];
    for (const b of docs) {
      for (const p of b.passengers) {
        rows.push([
          b.reference ?? '',
          p.fullName,
          p.dateOfBirth,
          p.passportNumber,
          b.cabinClass,
          b.status,
        ]);
      }
    }
    return rows.map((r) => r.map((v) => this.csvCell(v)).join(',')).join('\r\n');
  }

  /** Quotes the value and blocks spreadsheet formula injection. */
  private csvCell(value: string): string {
    let v = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
    return `"${v.replace(/"/g, '""')}"`;
  }
}