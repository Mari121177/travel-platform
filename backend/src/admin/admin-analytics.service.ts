import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BookingStatus } from '../hotel-bookings/hotel-booking.constants';
import { HotelBooking } from '../hotel-bookings/schemas/hotel-booking.schema';
import { FlightBookingStatus } from '../flight-bookings/enums/flight-booking-status.enum';
import { FlightBooking } from '../flight-bookings/schemas/flight-booking.schema';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

export interface ProviderAnalytics {
  type: 'hotel' | 'flight';
  providerId: string;
  providerName: string;
  bookings: number;
  revenue: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminAnalyticsService {
  constructor(
    @InjectModel(HotelBooking.name)
    private readonly hotelBookingModel: Model<HotelBooking>,
    @InjectModel(FlightBooking.name)
    private readonly flightBookingModel: Model<FlightBooking>,
  ) {}

  // BON-01: confirmed bookings and revenue per provider for a period.
  async overview(query: AnalyticsQueryDto) {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 30 * DAY_MS);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    if (from > to) throw new BadRequestException('from must not be after to');

    const createdAt = { $gte: from, $lte: to };
    const [hotels, flights] = await Promise.all([
      this.hotelBookingModel.aggregate<{
        _id: { id: unknown; name: string };
        bookings: number;
        revenue: number;
      }>([
        { $match: { createdAt, status: BookingStatus.Confirmed } },
        {
          $group: {
            _id: { id: '$hotelId', name: '$hotelName' },
            bookings: { $sum: 1 },
            revenue: { $sum: '$totalPrice' },
          },
        },
      ]),
      this.flightBookingModel.aggregate<{
        _id: { id: unknown; name: string };
        bookings: number;
        revenue: number;
      }>([
        {
          $match: {
            createdAt,
            status: FlightBookingStatus.Confirmed,
          },
        },
        {
          $group: {
            _id: { id: '$airlineId', name: '$airlineName' },
            bookings: { $sum: 1 },
            revenue: { $sum: '$totalPrice' },
          },
        },
      ]),
    ]);

    const providers: ProviderAnalytics[] = [
      ...hotels.map((h) => ({
        type: 'hotel' as const,
        providerId: String(h._id.id),
        providerName: h._id.name ?? 'Hotel',
        bookings: h.bookings,
        revenue: h.revenue,
      })),
      ...flights.map((f) => ({
        type: 'flight' as const,
        providerId: f._id.id ? String(f._id.id) : '',
        providerName: f._id.name ?? 'Airline',
        bookings: f.bookings,
        revenue: f.revenue,
      })),
    ].sort((a, b) => b.revenue - a.revenue);

    return {
      from,
      to,
      providers,
      totals: {
        bookings: providers.reduce((n, p) => n + p.bookings, 0),
        revenue: Math.round(
          providers.reduce((n, p) => n + p.revenue, 0) * 100,
        ) / 100,
      },
    };
  }
}
