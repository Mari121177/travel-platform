import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/** Read-only reference data seeded from Airports.csv (FLT-02, GEN-12) */
@Schema({ timestamps: true, collection: 'airports' })
export class Airport {
  @Prop({ required: true, unique: true, uppercase: true, trim: true }) iataCode: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true, index: true }) cityId: string;
  @Prop({ required: true, uppercase: true, index: true }) countryCode: string;
  @Prop({ required: true }) timeZone: string; // IANA, e.g. Africa/Cairo
}
export type AirportDocument = HydratedDocument<Airport>;
export const AirportSchema = SchemaFactory.createForClass(Airport);
