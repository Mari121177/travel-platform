import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export type ExchangeRateDocument = HydratedDocument<ExchangeRate>;

/**
 * ITN-18: the exchange rates fetched from FXRatesAPI, one document per day.
 * Rates are relative to the base currency (USD).
 */
@Schema({ timestamps: true, collection: 'exchange_rates' })
export class ExchangeRate {
  // The day (UTC, YYYY-MM-DD) the rates were fetched. One document per day.
  @Prop({ type: String, required: true, unique: true })
  day!: string;

  @Prop({ type: String, required: true, default: 'USD' })
  base!: string;

  // The rate date reported by the API, shown to the user
  @Prop({ type: Date, required: true })
  rateDate!: Date;

  // { "EGP": 53.42, "EUR": 0.907, ... }
  @Prop({ type: SchemaTypes.Mixed, required: true })
  rates!: Record<string, number>;
}

export const ExchangeRateSchema = SchemaFactory.createForClass(ExchangeRate);
