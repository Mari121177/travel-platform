import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { CabinClass } from './enums/flight.enums';

/**
 * Cabin inventory: one document per (flight, cabin class).
 * available seats = totalSeats - bookedSeats - heldSeats
 * Separate collection so flight booking can reserve seats with one atomic update.
 */
@Schema({ timestamps: true, collection: 'cabins' })
export class Cabin {
  @Prop({ type: Types.ObjectId, ref: 'Flight', required: true, index: true }) flight: Types.ObjectId;
  @Prop({ required: true, enum: Object.values(CabinClass) }) cabinClass: CabinClass;
  @Prop({ required: true, min: 1 }) totalSeats: number;
  @Prop({ default: 0, min: 0 }) bookedSeats: number;
  @Prop({ default: 0, min: 0 }) heldSeats: number;
  @Prop({ required: true, min: 0 }) price: number;
  /** Free baggage: number of bags and max kg per bag (FLT-04) */
  @Prop({ required: true, min: 0 }) freeBags: number;
  @Prop({ required: true, min: 0 }) maxBagWeightKg: number;
}
export type CabinDocument = HydratedDocument<Cabin>;
export const CabinSchema = SchemaFactory.createForClass(Cabin);
CabinSchema.index({ flight: 1, cabinClass: 1 }, { unique: true });
