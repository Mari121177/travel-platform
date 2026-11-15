import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class CancellationTierEntity {
  @Prop({ required: true, min: 0 }) daysBeforeDeparture: number;
  @Prop({ required: true, min: 0, max: 100 }) refundPercent: number;
}
const CancellationTierSchema = SchemaFactory.createForClass(CancellationTierEntity);

@Schema({ timestamps: true, collection: 'airlines' })
export class Airline {
  @Prop({ required: true, unique: true, trim: true }) name: string;

  /** IATA 2-character code */
  @Prop({ required: true, unique: true, uppercase: true, trim: true }) code: string;

  /** One logo per airline (GEN-08); the URL is set by the upload endpoint */
  @Prop() logoUrl?: string;

  /** Deactivated airlines are hidden from search and cannot be booked (ACC-15) */
  @Prop({ default: true, index: true }) isActive: boolean;

  /** FLT-08 (endpoints come in the next task) */
  @Prop({ min: 0 }) extraBagPrice?: number;
  @Prop({ min: 0, default: 0 }) maxExtraBags: number;

  /** FLT-09 (endpoints come in the next task) */
  @Prop({ type: [CancellationTierSchema], default: [] }) cancellationTiers: CancellationTierEntity[];
}
export type AirlineDocument = HydratedDocument<Airline>;
export const AirlineSchema = SchemaFactory.createForClass(Airline);
