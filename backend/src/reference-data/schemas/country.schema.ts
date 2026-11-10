import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CountryDocument = HydratedDocument<Country>;

@Schema({ collection: 'countries' })
export class Country {
  // Countries.csv: code (e.g. "EG")
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  // Currency code (e.g. "EGP"). The supported currencies are the distinct
  // values of this field (GEN-12, project description 5.1).
  @Prop({ required: true, uppercase: true, trim: true })
  currency!: string;
}

export const CountrySchema = SchemaFactory.createForClass(Country);