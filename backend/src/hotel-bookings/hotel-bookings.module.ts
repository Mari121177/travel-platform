import { forwardRef, Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HotelBookingsController } from './hotel-bookings.controller';
import { HotelBookingsService } from './hotel-bookings.service';
import { HotelsModule } from '../hotels/hotels.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { HOTEL_BOOKING_PORT } from './ports/hotel-booking.port';
import { HotelReservationsController } from './hotel-reservations.controller';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { HotelBooking, HotelBookingSchema } from './schemas/hotel-booking.schema';
import { Review, ReviewSchema } from './schemas/review.schema';
import { RoomNight, RoomNightSchema } from './schemas/room-night.schema';

// @Global so payments can inject HOTEL_BOOKING_PORT without importing this module
@Global()
@Module({
  imports: [
    NotificationsModule,
    forwardRef(() => HotelsModule), // circular: HotelsModule imports this module back
    MongooseModule.forFeature([
      { name: HotelBooking.name, schema: HotelBookingSchema },
      { name: RoomNight.name, schema: RoomNightSchema },
      { name: Review.name, schema: ReviewSchema },
    ]),
  ],
  controllers: [HotelBookingsController, HotelReservationsController, ReviewsController],
  providers: [
    HotelBookingsService,
    ReviewsService,
    { provide: HOTEL_BOOKING_PORT, useExisting: HotelBookingsService },
  ],
  // payments (confirmBooking/expireBooking/markPoliciesAccepted), hotels (room checks),
  // admin (review moderation, hasUpcomingConfirmedBookings) import this module
  exports: [HotelBookingsService, ReviewsService, HOTEL_BOOKING_PORT],
})
export class HotelBookingsModule {}