import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FlightStatus } from './enums/flight.enums';
import { Flight, FlightDocument } from './flight.schema';

/** FLT-30: a Scheduled flight becomes Departed once its departure time has passed. */
@Injectable()
export class FlightStatusScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FlightStatusScheduler.name);
  private timer?: NodeJS.Timeout;

  constructor(@InjectModel(Flight.name) private readonly flights: Model<FlightDocument>) {}

  onModuleInit() {
    void this.markDeparted();
    this.timer = setInterval(() => void this.markDeparted(), 60_000);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async markDeparted() {
    try {
      const res = await this.flights.updateMany(
        { status: FlightStatus.SCHEDULED, departureTime: { $lte: new Date() } },
        { $set: { status: FlightStatus.DEPARTED } },
      );
      if (res.modifiedCount) this.logger.log(`${res.modifiedCount} flight(s) marked Departed`);
    } catch (err) {
      this.logger.error(`markDeparted failed: ${(err as Error).message}`);
    }
  }
}
