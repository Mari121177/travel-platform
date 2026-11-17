import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HotelsModule } from '../hotels/hotels.module';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';
import { ExchangeRatesService } from './exchange-rates.service';
import { ItinerariesController } from './itineraries.controller';
import { ItinerariesService } from './itineraries.service';
import { ItineraryDaysController } from './itinerary-days.controller';
import { ItineraryDaysService } from './itinerary-days.service';
import { ItineraryHotelsController } from './itinerary-hotels.controller';
import { ItineraryHotelsService } from './itinerary-hotels.service';
import { Activity, ActivitySchema } from './schemas/activity.schema';
import { BudgetEntry, BudgetEntrySchema } from './schemas/budget-entry.schema';
import {
  ExchangeRate,
  ExchangeRateSchema,
} from './schemas/exchange-rate.schema';
import { Itinerary, ItinerarySchema } from './schemas/itinerary.schema';
import {
  TransportCost,
  TransportCostSchema,
} from './schemas/transport-cost.schema';
import { TransportCostsController } from './transport-costs.controller';
import { TransportCostsService } from './transport-costs.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Itinerary.name, schema: ItinerarySchema },
      { name: Activity.name, schema: ActivitySchema },
      { name: BudgetEntry.name, schema: BudgetEntrySchema },
      { name: TransportCost.name, schema: TransportCostSchema },
      { name: ExchangeRate.name, schema: ExchangeRateSchema },
    ]),
    // ITN-25: reuses the hotel search
    HotelsModule,
  ],
  controllers: [
    ItinerariesController,
    ItineraryDaysController,
    ActivitiesController,
    BudgetsController,
    TransportCostsController,
    ItineraryHotelsController,
  ],
  providers: [
    ItinerariesService,
    ItineraryDaysService,
    ActivitiesService,
    BudgetsService,
    TransportCostsService,
    ExchangeRatesService,
    ItineraryHotelsService,
  ],
  exports: [
    MongooseModule,
    ItinerariesService,
    ItineraryDaysService,
    ActivitiesService,
    BudgetsService,
    TransportCostsService,
    ExchangeRatesService,
  ],
})
export class ItinerariesModule {}
