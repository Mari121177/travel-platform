import { Module } from '@nestjs/common';
import { AirportsController } from './airports.controller';
import { AirportsService } from './airports.service';

// The Airport model comes from the global ReferenceDataModule, so nothing is
// imported here. Flight search imports this module to use AirportsService.
@Module({
  controllers: [AirportsController],
  providers: [AirportsService],
  exports: [AirportsService],
})
export class AirportsModule {}