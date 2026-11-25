import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReferenceDataController } from './reference-data.controller';
import { ReferenceDataSeeder } from './reference-data.seeder';
import { ReferenceDataService } from './reference-data.service';
import { Airport, AirportSchema } from './schemas/airport.schema';
import { Attraction, AttractionSchema } from './schemas/attraction.schema';
import { City, CitySchema } from './schemas/city.schema';
import { Country, CountrySchema } from './schemas/country.schema';

// Global, so teammates can inject the models and ReferenceDataService
// without importing this module.
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Country.name, schema: CountrySchema },
      { name: City.name, schema: CitySchema },
      { name: Airport.name, schema: AirportSchema },
      { name: Attraction.name, schema: AttractionSchema },
    ]),
  ],
  controllers: [ReferenceDataController],
  providers: [ReferenceDataSeeder, ReferenceDataService],
  exports: [MongooseModule, ReferenceDataService],
})
export class ReferenceDataModule {}