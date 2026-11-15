import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type LikeDocument = HydratedDocument<Like>;

@Schema({ timestamps: true, collection: 'likes' })
export class Like {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Post', required: true })
  postId!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const LikeSchema = SchemaFactory.createForClass(Like);

// BLG-06: a user can like a post at most once. The database enforces it, so
// two requests at the same time cannot both succeed.
LikeSchema.index({ postId: 1, userId: 1 }, { unique: true });
