import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type ItineraryDocument = HydratedDocument<Itinerary>;

export const ItineraryVisibility = {
  Private: 'private',
  Public: 'public',
} as const;
export type ItineraryVisibility =
  (typeof ItineraryVisibility)[keyof typeof ItineraryVisibility];

/**
 * ITN-01: an itinerary owned by one registered user.
 * Days, activities and budget entries are added in later tasks (ITN-05, ITN-10, ITN-14).
 */
@Schema({ timestamps: true, collection: 'itineraries' })
export class Itinerary {
  // Owner. Only the owner may edit or delete (GEN-13).
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true, index: true })
  ownerId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 100 })
  title!: string;

  // Country codes from the seeded countries collection (for example "EG", "FR")
  @Prop({ type: [String], default: [] })
  countries!: string[];

  // Day 1 of the trip. Day dates are derived from this (ITN-05).
  @Prop({ type: Date, required: true })
  startDate!: Date;

  // Private itineraries are visible to the owner only (ITN-20)
  @Prop({
    type: String,
    enum: Object.values(ItineraryVisibility),
    default: ItineraryVisibility.Private,
  })
  visibility!: ItineraryVisibility;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ItinerarySchema = SchemaFactory.createForClass(Itinerary);

// "My itineraries" list, newest first (ITN-03)
ItinerarySchema.index({ ownerId: 1, createdAt: -1 });
// Public search (ITN-20)
ItinerarySchema.index({ visibility: 1, title: 1 });