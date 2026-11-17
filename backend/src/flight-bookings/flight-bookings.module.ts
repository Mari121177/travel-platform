import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Airline, AirlineSchema } from '../airlines/airline.schema';
import { Cabin, CabinSchema } from '../flights/cabin.schema';
import { Flight, FlightSchema } from '../flights/flight.schema';
import { NotificationsModule } from '../notifications/notifications.module';
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
    NotificationsModule,
    MongooseModule.forFeature([
      { name: FlightBooking.name, schema: FlightBookingSchema },
      { name: Cabin.name, schema: CabinSchema },
      { name: Flight.name, schema: FlightSchema },
      { name: Airline.name, schema: AirlineSchema },
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