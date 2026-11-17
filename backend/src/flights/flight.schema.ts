import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { FlightStatus } from './enums/flight.enums';

@Schema({ timestamps: true, collection: 'flights' })
export class Flight {
  @Prop({ type: Types.ObjectId, ref: 'Airline', required: true, index: true }) airline: Types.ObjectId;
  @Prop({ required: true, uppercase: true, trim: true }) flightNumber: string;

  /** IATA codes from the seeded airports collection */
  @Prop({ required: true, uppercase: true }) departureAirport: string;
  @Prop({ required: true, uppercase: true }) arrivalAirport: string;

  /** Stored in UTC (FLT-03). Convert with the airport timeZone for display (GEN-06). */
  @Prop({ required: true }) departureTime: Date;
  @Prop({ required: true }) arrivalTime: Date;

  /** Local calendar date at the departure airport, for the duplicate-flight rule */
  @Prop({ required: true }) departureLocalDate: string;

  @Prop({ enum: Object.values(FlightStatus), default: FlightStatus.SCHEDULED }) status: FlightStatus;
  @Prop() cancelReason?: string;
  @Prop() cancelledAt?: Date;
}
export type FlightDocument = HydratedDocument<Flight>;
export const FlightSchema = SchemaFactory.createForClass(Flight);
FlightSchema.index({ airline: 1, flightNumber: 1, departureLocalDate: 1 }, { unique: true });
FlightSchema.index({ departureAirport: 1, arrivalAirport: 1, departureTime: 1, status: 1 });
