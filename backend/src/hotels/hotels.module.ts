import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HotelsController } from './hotels.controller';
import { HotelsService } from './hotels.service';
import { Hotel, HotelSchema } from './schemas/hotel.schema';
import { Room, RoomSchema } from './schemas/room.schema';
import { HotelBookingsModule } from '../hotel-bookings/hotel-bookings.module';

// The City model comes from Mariam's ReferenceDataModule, which is @Global(),
// so it can be injected here without registering it again.
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Hotel.name, schema: HotelSchema },
      { name: Room.name, schema: RoomSchema },
    ]),
    // Circular: we use their helpers, they use ours (agreed with member 6)
    forwardRef(() => HotelBookingsModule),
  ],
  controllers: [HotelsController],
  providers: [HotelsService],
  exports: [HotelsService],
})
export class HotelsModule {}
