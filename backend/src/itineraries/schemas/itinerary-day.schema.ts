import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

/**
 * ITN-05: one day of an itinerary, stored inside the itinerary document.
 * The day number and the date are NOT stored: they come from the position in
 * the days array and the itinerary start date, so adding, deleting and
 * reordering days can never leave wrong numbers or dates behind.
 */
@Schema()
export class ItineraryDay {
  // Created by Mongoose. This is the :dayId used in the routes.
  _id!: Types.ObjectId;

  // City.cityId from the seeded cities (a text slug such as "cairo") (ITN-09)
  @Prop({ type: String, required: true, trim: true })
  cityId!: string;

  @Prop({ type: String, default: '', trim: true })
  notes!: string;
}

export const ItineraryDaySchema = SchemaFactory.createForClass(ItineraryDay);
