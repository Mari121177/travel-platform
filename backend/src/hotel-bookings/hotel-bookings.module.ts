import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HotelBookingsController } from './hotel-bookings.controller';
import { HotelBookingsService } from './hotel-bookings.service';
import { HotelsModule } from '../hotels/hotels.module';
import { HotelReservationsController } from './hotel-reservations.controller';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { HotelBooking, HotelBookingSchema } from './schemas/hotel-booking.schema';
import { Review, ReviewSchema } from './schemas/review.schema';
import { RoomNight, RoomNightSchema } from './schemas/room-night.schema';

@Module({
  imports: [
    forwardRef(() => HotelsModule), // circular: HotelsModule imports this module back
    MongooseModule.forFeature([
      { name: HotelBooking.name, schema: HotelBookingSchema },
      { name: RoomNight.name, schema: RoomNightSchema },
      { name: Review.name, schema: ReviewSchema },
    ]),
  ],
  controllers: [HotelBookingsController, HotelReservationsController, ReviewsController],
  providers: [HotelBookingsService, ReviewsService],
  // payments (confirmBooking/expireBooking/markPoliciesAccepted), hotels (room checks),
  // admin (review moderation, hasUpcomingConfirmedBookings) import this module
  exports: [HotelBookingsService, ReviewsService],
})
export class HotelBookingsModule {}
