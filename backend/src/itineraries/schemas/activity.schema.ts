import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import {
  ACTIVITY_DESCRIPTION_MAX_LENGTH,
  ACTIVITY_NAME_MAX_LENGTH,
} from '../itinerary.constants';

export type ActivityDocument = HydratedDocument<Activity>;

/**
 * ITN-10: an activity on one day of an itinerary. It has its own collection
 * because the API edits it by its own id (PATCH /activities/:id).
 */
@Schema({ timestamps: true, collection: 'activities' })
export class Activity {
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
    required: true,
    trim: true,
    maxlength: ACTIVITY_NAME_MAX_LENGTH,
  })
  name!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: ACTIVITY_DESCRIPTION_MAX_LENGTH,
  })
  description!: string;

  // Optional, "HH:mm"
  @Prop({ type: String, default: null })
  time?: string | null;

  // Optional cost. A cost always has a currency, and the other way round.
  @Prop({ type: Number, min: 0, default: null })
  cost?: number | null;

  @Prop({ type: String, uppercase: true, default: null })
  currency?: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);

ActivitySchema.index({ itineraryId: 1, dayId: 1 });
