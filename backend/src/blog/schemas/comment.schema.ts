import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { COMMENT_MAX_LENGTH } from '../blog.constants';
import { maxCharacters } from '../validators/max-characters';

export type CommentDocument = HydratedDocument<Comment>;

@Schema({ timestamps: true, collection: 'comments' })
export class Comment {
  /** The published post this comment belongs to (BLG-05). */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Post', required: true })
  postId!: Types.ObjectId;

  /** The author. Only the author can edit or delete the comment (BLG-07). */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  authorId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
    validate: maxCharacters(COMMENT_MAX_LENGTH),
  })
  text!: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

// "Comments of a post, oldest first" (BLG-05, BLG-02)
CommentSchema.index({ postId: 1, createdAt: 1, _id: 1 });