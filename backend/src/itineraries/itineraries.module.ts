import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ItinerariesController } from './itineraries.controller';
import { ItinerariesService } from './itineraries.service';
import { ItineraryDaysController } from './itinerary-days.controller';
import { ItineraryDaysService } from './itinerary-days.service';
import { Itinerary, ItinerarySchema } from './schemas/itinerary.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Itinerary.name, schema: ItinerarySchema },
    ]),
  ],
  controllers: [ItinerariesController, ItineraryDaysController],
  providers: [ItinerariesService, ItineraryDaysService],
  exports: [MongooseModule, ItinerariesService, ItineraryDaysService],
})
export class ItinerariesModule {}
