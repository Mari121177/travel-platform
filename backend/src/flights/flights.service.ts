import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { AirlinesService } from '../airlines/airlines.service';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { Airport, AirportDocument } from '../reference-data/schemas/airport.schema';
import { Cabin, CabinDocument } from './cabin.schema';
import {
  CancelFlightDto, CreateCabinDto, CreateFlightDto, UpdateCabinDto, UpdateFlightDto,
} from './dto/flight.dto';
import { FlightStatus } from './enums/flight.enums';
import { Flight, FlightDocument } from './flight.schema';
import { localDate, localToUtc, utcToLocal } from './utils/time.util';

@Injectable()
export class FlightsService {
  constructor(
    @InjectModel(Flight.name) private readonly flights: Model<FlightDocument>,
    @InjectModel(Cabin.name) private readonly cabins: Model<CabinDocument>,
    @InjectModel(Airport.name) private readonly airports: Model<AirportDocument>,
    private readonly airlines: AirlinesService,
  ) {}

  // ---------------- FLT-03 ----------------
  async create(dto: CreateFlightDto, user: AuthUser) {
    if (!user.assignedProviderId) throw new ForbiddenException('No airline is assigned to your account');
    const airline = await this.airlines.findOne(user.assignedProviderId);
    this.airlines.assertManages(airline, user);
    if (!airline.isActive) throw new BadRequestException('Airline is deactivated');

    const dep = dto.departureAirport.toUpperCase();
    const arr = dto.arrivalAirport.toUpperCase();
    if (dep === arr) throw new BadRequestException('Departure and arrival airports must differ');
    const ap = await this.loadAirports([dep, arr]);
    if (!ap.has(dep) || !ap.has(arr)) {
      throw new BadRequestException('Unknown airport: only airports from the predefined list are allowed');
    }

    const depUtc = localToUtc(dto.departureTime, ap.get(dep)!.timeZone);
    const arrUtc = localToUtc(dto.arrivalTime, ap.get(arr)!.timeZone);
    if (arrUtc <= depUtc) throw new BadRequestException('Arrival must be after departure (compared in UTC)');
    if (depUtc <= new Date()) throw new BadRequestException('Departure cannot be in the past');

    try {
      const flight = await this.flights.create({
        airline: airline._id,
        flightNumber: dto.flightNumber,
        departureAirport: dep,
        arrivalAirport: arr,
        departureTime: depUtc,
        arrivalTime: arrUtc,
        departureLocalDate: localDate(depUtc, ap.get(dep)!.timeZone),
      });
      return this.view(flight);
    } catch (e: any) {
      if (e.code === 11000) {
        throw new ConflictException('This airline already has this flight number on that departure date');
      }
      throw e;
    }
  }

  // ---------------- FLT-05: times and airports ----------------
  async update(id: string, dto: UpdateFlightDto, user: AuthUser) {
    const flight = await this.getOwnedFlight(id, user);
    this.assertScheduled(flight);
    if (!dto.departureTime && !dto.arrivalTime && !dto.departureAirport && !dto.arrivalAirport) {
      throw new BadRequestException('Nothing to update');
    }

    const dep = (dto.departureAirport ?? flight.departureAirport).toUpperCase();
    const arr = (dto.arrivalAirport ?? flight.arrivalAirport).toUpperCase();
    const depChanged = dep !== flight.departureAirport;
    const arrChanged = arr !== flight.arrivalAirport;

    if (depChanged || arrChanged) {
      if (depChanged && !dto.departureTime) {
        throw new BadRequestException('Send departureTime when changing the departure airport');
      }
      if (arrChanged && !dto.arrivalTime) {
        throw new BadRequestException('Send arrivalTime when changing the arrival airport');
      }
      const seatsTaken = await this.cabins.exists({
        flight: flight._id,
        $expr: { $gt: [{ $add: ['$bookedSeats', '$heldSeats'] }, 0] },
      });
      if (seatsTaken) throw new ConflictException('Airports cannot be changed once the flight has bookings');
    }
    if (dep === arr) throw new BadRequestException('Departure and arrival airports must differ');

    const ap = await this.loadAirports([dep, arr]);
    if (!ap.has(dep) || !ap.has(arr)) throw new BadRequestException('Unknown airport');

    const depUtc = dto.departureTime ? localToUtc(dto.departureTime, ap.get(dep)!.timeZone) : flight.departureTime;
    const arrUtc = dto.arrivalTime ? localToUtc(dto.arrivalTime, ap.get(arr)!.timeZone) : flight.arrivalTime;
    if (arrUtc <= depUtc) throw new BadRequestException('Arrival must be after departure (compared in UTC)');
    if (depUtc <= new Date()) throw new BadRequestException('Departure cannot be in the past');

    const timeChanged =
      depUtc.getTime() !== flight.departureTime.getTime() || arrUtc.getTime() !== flight.arrivalTime.getTime();

    flight.departureAirport = dep;
    flight.arrivalAirport = arr;
    flight.departureTime = depUtc;
    flight.arrivalTime = arrUtc;
    flight.departureLocalDate = localDate(depUtc, ap.get(dep)!.timeZone);
    try {
      await flight.save();
    } catch (e: any) {
      if (e.code === 11000) {
        throw new ConflictException('This airline already has this flight number on that departure date');
      }
      throw e;
    }

    if (timeChanged) {
      // TODO (flight bookings + notifications): send an in-app notification to passengers
      // with Confirmed bookings on this flight (FLT-05, GEN-01).
    }
    return this.view(flight);
  }

  // ---------------- FLT-06 ----------------
  async cancel(id: string, dto: CancelFlightDto, user: AuthUser) {
    const flight = await this.getOwnedFlight(id, user);
    this.assertScheduled(flight);
    flight.status = FlightStatus.CANCELLED;
    flight.cancelReason = dto.reason;
    flight.cancelledAt = new Date();
    await flight.save();
    // TODO (flight bookings + payments + notifications): cancel all Confirmed bookings with a
    // 100% refund (PAY-03), release pending seat holds, notify passengers (GEN-01).
    return this.view(flight);
  }

  // ---------------- FLT-04 / FLT-05: cabins ----------------
  async addCabin(flightId: string, dto: CreateCabinDto, user: AuthUser) {
    const flight = await this.getOwnedFlight(flightId, user);
    this.assertScheduled(flight);
    try {
      const cabin = await this.cabins.create({ ...dto, flight: flight._id });
      return this.cabinView(cabin.toObject());
    } catch (e: any) {
      if (e.code === 11000) throw new ConflictException(`Cabin "${dto.cabinClass}" already exists on this flight`);
      throw e;
    }
  }

  async updateCabin(flightId: string, cabinId: string, dto: UpdateCabinDto, user: AuthUser) {
    const flight = await this.getOwnedFlight(flightId, user);
    this.assertScheduled(flight);
    if (!isValidObjectId(cabinId)) throw new BadRequestException('Invalid cabin id');
    const existing = await this.cabins.findOne({ _id: cabinId, flight: flight._id }).lean();
    if (!existing) throw new NotFoundException('Cabin not found on this flight');

    const { totalSeats, ...rest } = dto;
    const filter: Record<string, any> = { _id: cabinId, flight: flight._id };
    const set: Record<string, any> = { ...rest };
    if (totalSeats !== undefined) {
      set.totalSeats = totalSeats;
      // atomic: seats cannot drop below booked + held
      filter.$expr = { $lte: [{ $add: ['$bookedSeats', '$heldSeats'] }, totalSeats] };
    }
    if (!Object.keys(set).length) throw new BadRequestException('Nothing to update');

    const updated = await this.cabins
      .findOneAndUpdate(filter, { $set: set }, { new: true, runValidators: true })
      .lean();
    if (!updated) {
      throw new BadRequestException(
        `Seat count cannot be below seats already booked or held (${existing.bookedSeats + existing.heldSeats})`,
      );
    }
    return this.cabinView(updated);
  }

  // ---------------- helpers ----------------
  private cabinView(c: any) {
    return { ...c, availableSeats: c.totalSeats - c.bookedSeats - c.heldSeats };
  }

  private async loadAirports(codes: string[]) {
    const list = await this.airports.find({ iataCode: { $in: codes } }).lean();
    return new Map(list.map((a) => [a.iataCode, a] as const));
  }

  private async view(f: FlightDocument) {
    const ap = await this.loadAirports([f.departureAirport, f.arrivalAirport]);
    const dz = ap.get(f.departureAirport)?.timeZone;
    const az = ap.get(f.arrivalAirport)?.timeZone;
    return {
      ...f.toObject(),
      departureLocal: dz ? utcToLocal(f.departureTime, dz) : undefined,
      arrivalLocal: az ? utcToLocal(f.arrivalTime, az) : undefined,
      departureTimeZone: dz,
      arrivalTimeZone: az,
    };
  }

  /** FLT-30: a Scheduled flight whose departure has passed becomes Departed */
  private async markDeparted() {
    await this.flights.updateMany(
      { status: FlightStatus.SCHEDULED, departureTime: { $lte: new Date() } },
      { $set: { status: FlightStatus.DEPARTED } },
    );
  }

  private async getOwnedFlight(id: string, user: AuthUser) {
    if (!isValidObjectId(id)) throw new BadRequestException('Invalid flight id');
    await this.markDeparted();
    const flight = await this.flights.findById(id);
    if (!flight) throw new NotFoundException('Flight not found');
    this.airlines.assertManages({ _id: flight.airline }, user);
    return flight;
  }

  private assertScheduled(f: FlightDocument) {
    if (f.status === FlightStatus.CANCELLED) throw new ConflictException('Flight is already cancelled');
    if (f.status === FlightStatus.DEPARTED) throw new BadRequestException('Flight has already departed');
  }
}
