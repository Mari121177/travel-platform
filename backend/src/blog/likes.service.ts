import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { PostStatus } from './post-status.enum';
import { Like } from './schemas/like.schema';
import { Post } from './schemas/post.schema';

const DUPLICATE_KEY_ERROR = 11000;

@Injectable()
export class LikesService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Like.name) private readonly likeModel: Model<Like>,
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
  ) {}

  /** BLG-06: like a published post, once per user. */
  async like(userId: string, postId: string) {
    // One transaction: the like and the post's likeCount are saved together
    // or not at all.
    return this.connection.transaction(async (session) => {
      // Counting first doubles as the check that the post is published, and
      // it conflicts with a post being deleted at the same time. Missing
      // posts and drafts both give 404, so nobody can tell that someone
      // else's draft exists.
      const post = await this.postModel
        .findOneAndUpdate(
          { _id: postId, status: PostStatus.Published },
          { $inc: { likeCount: 1 } },
          { new: true, session },
        )
        .select('likeCount')
        .lean()
        .exec();
      if (!post) {
        throw new NotFoundException('Post not found');
      }

      try {
        await this.likeModel.create(
          [
            {
              postId: new Types.ObjectId(postId),
              userId: new Types.ObjectId(userId),
            },
          ],
          { session },
        );
      } catch (error) {
        // The unique index rejects a second like from the same user.
        // Throwing here also rolls back the counter change above.
        if ((error as { code?: number }).code === DUPLICATE_KEY_ERROR) {
          throw new ConflictException('You already liked this post');
        }
        throw error;
      }

      return { liked: true, likeCount: post.likeCount };
    });
  }

  /** BLG-06: remove my like. */
  async unlike(userId: string, postId: string) {
    return this.connection.transaction(async (session) => {
      // Only the request that really removed the like lowers the counter
      const removed = await this.likeModel
        .findOneAndDelete(
          {
            postId: new Types.ObjectId(postId),
            userId: new Types.ObjectId(userId),
          },
          { session },
        )
        .exec();
      if (!removed) {
        throw new NotFoundException('You have not liked this post');
      }

      // Never below 0, even if the counter was already wrong
      const post = await this.postModel
        .findOneAndUpdate(
          { _id: postId, likeCount: { $gt: 0 } },
          { $inc: { likeCount: -1 } },
          { new: true, session },
        )
        .select('likeCount')
        .lean()
        .exec();

      return { liked: false, likeCount: post?.likeCount ?? 0 };
    });
  }
}