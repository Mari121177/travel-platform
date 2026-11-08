import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AttractionDocument = HydratedDocument<Attraction>;

@Schema({ collection: 'attractions' })
export class Attraction {
  // Attractions.csv: attraction_id (e.g. "att-1")
  @Prop({ required: true, unique: true, trim: true })
  attractionId!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  // Refers to City.cityId
  @Prop({ required: true, trim: true })
  cityId!: string;
}

export const AttractionSchema = SchemaFactory.createForClass(Attraction);
AttractionSchema.index({ cityId: 1 });