import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ collection: 'reviews', timestamps: true })
export class Review {
  // one review per reservation, regardless of number of rooms (HTL-23)
  @Prop({ type: Types.ObjectId, required: true, unique: true })
  bookingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  hotelId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ type: String, maxlength: 1000 })
  comment?: string;

  // GEN-10: hidden content is visible only to its author and admins
  @Prop({ type: Boolean, default: false })
  isHidden: boolean;
}

export type ReviewDocument = HydratedDocument<Review>;
export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ hotelId: 1, isHidden: 1, createdAt: -1 });
