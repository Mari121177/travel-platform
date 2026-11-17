import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { ItineraryDay, ItineraryDaySchema } from './itinerary-day.schema';

export type ItineraryDocument = HydratedDocument<Itinerary>;

export const ItineraryVisibility = {
  Private: 'private',
  Public: 'public',
} as const;
export type ItineraryVisibility =
  (typeof ItineraryVisibility)[keyof typeof ItineraryVisibility];

/** ITN-21: where a cloned itinerary came from (credits the original author). */
@Schema({ _id: false })
export class ClonedFrom {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  itineraryId!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  authorId!: Types.ObjectId;

  // Saved as text, so the credit stays even if the original is deleted
  @Prop({ type: String, required: true })
  authorName!: string;
}
export const ClonedFromSchema = SchemaFactory.createForClass(ClonedFrom);

/**
 * ITN-01: an itinerary owned by one registered user.
 * Days are stored inside it (ITN-05). Activities, budget entries and transport
 * costs are stored in their own collections (ITN-10, ITN-14, ITN-16).
 */
@Schema({ timestamps: true, collection: 'itineraries' })
export class Itinerary {
  // Owner. Only the owner may edit or delete (GEN-13).
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
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

  // Ordered days, at most 60 (ITN-05). The array order is the day order.
  @Prop({ type: [ItineraryDaySchema], default: [] })
  days!: ItineraryDay[];

  // GEN-10: hidden content is visible only to its author and admins.
  // Name to confirm with Mariam, who owns the admin side.
  @Prop({ type: Boolean, default: false, index: true })
  isHidden!: boolean;
  // ITN-21: set only on clones
  @Prop({ type: ClonedFromSchema, default: null })
  clonedFrom!: ClonedFrom | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ItinerarySchema = SchemaFactory.createForClass(Itinerary);

// "My itineraries" list, newest first (ITN-03)
ItinerarySchema.index({ ownerId: 1, updatedAt: -1 });
// Public search (ITN-20)
ItinerarySchema.index({ visibility: 1, title: 1 });
