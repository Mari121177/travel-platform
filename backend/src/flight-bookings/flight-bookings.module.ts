import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FlightBookingsController } from './flight-bookings.controller';
import { FlightBookingsService } from './flight-bookings.service';
import { FLIGHT_BOOKING_PORT } from './ports/flight-booking.port';
import {
  FlightBooking,
  FlightBookingSchema,
} from './schemas/flight-booking.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FlightBooking.name, schema: FlightBookingSchema },
    ]),
  ],
  controllers: [FlightBookingsController],
  providers: [
    FlightBookingsService,
    { provide: FLIGHT_BOOKING_PORT, useExisting: FlightBookingsService },
  ],
  exports: [FlightBookingsService, FLIGHT_BOOKING_PORT],
})
export class FlightBookingsModule {}