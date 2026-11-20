import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AirlinesModule } from '../airlines/airlines.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Cabin, CabinSchema } from './cabin.schema';
import { Flight, FlightSchema } from './flight.schema';
import { FlightsController } from './flights.controller';
import { FlightStatusScheduler } from './flight-status.scheduler';
import { FlightsService } from './flights.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Flight.name, schema: FlightSchema },
      { name: Cabin.name, schema: CabinSchema },
    ]),
    AirlinesModule,
    NotificationsModule,
  ],
  controllers: [FlightsController],
  providers: [FlightsService, FlightStatusScheduler],
  exports: [FlightsService, MongooseModule],
})
export class FlightsModule {}
