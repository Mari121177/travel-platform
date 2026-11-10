import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CityDocument = HydratedDocument<City>;

@Schema({ collection: 'cities' })
export class City {
  // Cities.csv: city_id, a text slug such as "cairo" or "new_york" (not an ObjectId)
  @Prop({ required: true, unique: true, trim: true })
  cityId!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  // Refers to Country.code
  @Prop({ required: true, uppercase: true, trim: true })
  countryCode!: string;
}

export const CitySchema = SchemaFactory.createForClass(City);
CitySchema.index({ countryCode: 1 });