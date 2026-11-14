import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PostStatus } from './post-status.enum';
import { Like } from './schemas/like.schema';
import { Post } from './schemas/post.schema';

const DUPLICATE_KEY_ERROR = 11000;

@Injectable()
export class LikesService {
  constructor(
    @InjectModel(Like.name) private readonly likeModel: Model<Like>,
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
  ) {}

  /** BLG-06: like a published post, once per user. */
  async like(userId: string, postId: string) {
    // Missing posts and drafts both give 404, so nobody can tell that
    // someone else's draft exists.
    const post = await this.postModel
      .exists({ _id: postId, status: PostStatus.Published })
      .exec();
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    try {
      await this.likeModel.create({
        postId: new Types.ObjectId(postId),
        userId: new Types.ObjectId(userId),
      });
    } catch (error) {
      // The unique index rejects a second like from the same user
      if ((error as { code?: number }).code === DUPLICATE_KEY_ERROR) {
        throw new ConflictException('You already liked this post');
      }
      throw error;
    }

    return { liked: true, likeCount: await this.changeCount(postId, 1) };
  }

  /** BLG-06: remove my like. */
  async unlike(userId: string, postId: string) {
    const removed = await this.likeModel
      .findOneAndDelete({
        postId: new Types.ObjectId(postId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    if (!removed) {
      throw new NotFoundException('You have not liked this post');
    }

    return { liked: false, likeCount: await this.changeCount(postId, -1) };
  }

  // Changes the counter on the post atomically and never below 0.
  // Returns the new like count.
  private async changeCount(postId: string, change: 1 | -1): Promise<number> {
    const filter =
      change === -1
        ? { _id: postId, likeCount: { $gt: 0 } }
        : { _id: postId };
    const post = await this.postModel
      .findOneAndUpdate(filter, { $inc: { likeCount: change } }, { new: true })
      .select('likeCount')
      .lean()
      .exec();
    if (post) {
      return post.likeCount;
    }
    const current = await this.postModel
      .findById(postId)
      .select('likeCount')
      .lean()
      .exec();
    return current?.likeCount ?? 0;
  }
}
