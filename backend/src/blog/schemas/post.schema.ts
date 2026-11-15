import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { POST_BODY_MAX_LENGTH, POST_TITLE_MAX_LENGTH } from '../blog.constants';
import { PostStatus } from '../post-status.enum';
import { maxCharacters } from '../validators/max-characters';

export type PostDocument = HydratedDocument<Post>;

@Schema({ timestamps: true, collection: 'posts' })
export class Post {
  /** The author. Only the author can edit or delete the post (BLG-04). */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  authorId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
    validate: maxCharacters(POST_TITLE_MAX_LENGTH),
  })
  title!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    validate: maxCharacters(POST_BODY_MAX_LENGTH),
  })
  body!: string;

  /** Lower-case, no duplicates, at most 5 (BLG-08). */
  @Prop({ type: [String], default: [] })
  tags!: string[];

  /** Upload URLs from POST /api/uploads/images, at most 5 (GEN-08). */
  @Prop({ type: [String], default: [] })
  images!: string[];

  @Prop({
    type: String,
    enum: Object.values(PostStatus),
    default: PostStatus.Draft,
  })
  status!: PostStatus;

  /** Set the first time the post is published. */
  @Prop({ type: Date, default: null })
  publishedAt!: Date | null;

  /**
   * Counters kept on the post so lists do not need extra queries.
   * BLG-06 (likes) and BLG-05 (comments) add and subtract with $inc.
   */
  @Prop({ type: Number, default: 0, min: 0 })
  likeCount!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  commentCount!: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// "My posts, newest first" (BLG-03)
// matches the sort in findMine (createdAt, then _id)
PostSchema.index({ authorId: 1, createdAt: -1, _id: -1 });
// Public list and tag pages (BLG-02, BLG-08)
PostSchema.index({ status: 1, publishedAt: -1 });
PostSchema.index({ tags: 1, status: 1, publishedAt: -1 });
