import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export const FavoriteType = {
  Hotel: 'hotel',
  Itinerary: 'itinerary',
} as const;
export type FavoriteType = (typeof FavoriteType)[keyof typeof FavoriteType];

export type FavoriteDocument = HydratedDocument<Favorite>;

@Schema({ timestamps: true, collection: 'favorites' })
export class Favorite {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(FavoriteType), required: true })
  type!: FavoriteType;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  targetId!: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const FavoriteSchema = SchemaFactory.createForClass(Favorite);

// BON-02: a user can save the same item only once.
FavoriteSchema.index(
  { userId: 1, type: 1, targetId: 1 },
  { unique: true },
);
FavoriteSchema.index({ userId: 1, createdAt: -1 });
