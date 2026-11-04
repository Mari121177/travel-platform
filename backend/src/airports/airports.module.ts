import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Airport, AirportSchema } from './airport.schema';
import { AirportsService } from './airports.service';
import { AirportsController } from './airports.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Airport.name, schema: AirportSchema }])],
  controllers: [AirportsController],
  providers: [AirportsService],
  exports: [AirportsService, MongooseModule],
})
export class AirportsModule {}
