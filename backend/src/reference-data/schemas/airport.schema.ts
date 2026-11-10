import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AirportDocument = HydratedDocument<Airport>;

@Schema({ collection: 'airports' })
export class Airport {
  // Airports.csv: iata_code (e.g. "CAI")
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  iataCode!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  // Refers to City.cityId
  @Prop({ required: true, trim: true })
  cityId!: string;

  // Refers to Country.code
  @Prop({ required: true, uppercase: true, trim: true })
  countryCode!: string;

  // IANA time zone (e.g. "Africa/Cairo"), used by FLT-03 and GEN-06
  @Prop({ required: true, trim: true })
  timeZone!: string;
}

export const AirportSchema = SchemaFactory.createForClass(Airport);
AirportSchema.index({ cityId: 1 });
AirportSchema.index({ countryCode: 1 });