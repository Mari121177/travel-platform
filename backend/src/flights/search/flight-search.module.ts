import { Module } from '@nestjs/common';
import { AirlinesModule } from '../../airlines/airlines.module';
import { FlightsModule } from '../flights.module';
import { FlightSearchController } from './flight-search.controller';
import { FlightSearchService } from './flight-search.service';

// Both modules export MongooseModule, which gives this module the Flight,
// Cabin and Airline models. The Airport model comes from the global
// ReferenceDataModule. Nothing in Malk's or Mariam's modules is edited.
@Module({
  imports: [FlightsModule, AirlinesModule],
  controllers: [FlightSearchController],
  providers: [FlightSearchService],
})
export class FlightSearchModule {}