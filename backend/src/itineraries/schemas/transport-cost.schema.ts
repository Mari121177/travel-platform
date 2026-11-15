import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { TransportMode } from '../itinerary.constants';

export type TransportCostDocument = HydratedDocument<TransportCost>;

/** ITN-16: the cost of travelling between two cities on one day (intercity). */
@Schema({ timestamps: true, collection: 'transport_costs' })
export class TransportCost {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Itinerary',
    required: true,
    index: true,
  })
  itineraryId!: Types.ObjectId;

  // The _id of a day inside itinerary.days
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  dayId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(TransportMode),
    required: true,
  })
  mode!: TransportMode;

  // City.cityId from the seeded cities (a text slug such as "cairo")
  @Prop({ type: String, required: true, trim: true })
  fromCityId!: string;

  @Prop({ type: String, required: true, trim: true })
  toCityId!: string;

  @Prop({ type: Number, min: 0, required: true })
  amount!: number;

  @Prop({ type: String, uppercase: true, required: true })
  currency!: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TransportCostSchema = SchemaFactory.createForClass(TransportCost);

TransportCostSchema.index({ itineraryId: 1, dayId: 1 });
