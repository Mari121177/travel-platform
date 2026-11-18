import { Injectable } from '@nestjs/common';
import type { AdminFlightBookingFilter } from '../flight-bookings/ports/admin-flight-bookings.types';
import { FlightBookingsService } from '../flight-bookings/flight-bookings.service';
import type { AdminHotelBookingFilter } from '../hotel-bookings/ports/admin-bookings.types';
import { HotelBookingsService } from '../hotel-bookings/hotel-bookings.service';
import {
  AdminBookingType,
  ListAdminBookingsQueryDto,
} from './dto/list-bookings-query.dto';

const PAGE_SIZE = 10; // GEN-05

@Injectable()
export class AdminBookingsService {
  constructor(
    private readonly hotelBookings: HotelBookingsService,
    private readonly flightBookings: FlightBookingsService,
  ) {}

  // ACC-17: flight + hotel bookings in one list, filterable by type, status
  // and createdAt range. Each side supplies its newest rows, then we merge and
  // page the combined list.
  async list(query: ListAdminBookingsQueryDto) {
    const page = query.page ?? 1;
    const fetchLimit = Math.min(100, page * PAGE_SIZE);

    const hotelWanted =
      query.type === AdminBookingType.All || query.type === AdminBookingType.Hotel;
    const flightWanted =
      query.type === AdminBookingType.All ||
      query.type === AdminBookingType.Flight;

    const [hotelPage, flightPage] = await Promise.all([
      hotelWanted
        ? this.hotelBookings.listAllForAdmin({
            status: query.status as AdminHotelBookingFilter['status'],
            from: query.from,
            to: query.to,
            page: 1,
            limit: fetchLimit,
          })
        : Promise.resolve({ data: [], total: 0, page: 1, limit: fetchLimit }),
      flightWanted
        ? this.flightBookings.listAllForAdmin({
            status: query.status as AdminFlightBookingFilter['status'],
            from: query.from,
            to: query.to,
            page: 1,
            limit: fetchLimit,
          })
        : Promise.resolve({ data: [], total: 0, page: 1, limit: fetchLimit }),
    ]);

    const merged = [...hotelPage.data, ...flightPage.data].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const total = hotelPage.total + flightPage.total;
    const start = (page - 1) * PAGE_SIZE;

    return {
      data: merged.slice(start, start + PAGE_SIZE),
      total,
      page,
      limit: PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  }
}
