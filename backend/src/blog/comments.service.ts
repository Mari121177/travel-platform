import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { PostStatus } from './post-status.enum';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { Post } from './schemas/post.schema';

@Injectable()
export class CommentsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Comment.name) private readonly commentModel: Model<Comment>,
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
  ) {}

  /** BLG-05: comment on a published post. */
  async create(authorId: string, postId: string, dto: CreateCommentDto) {
    // One transaction: the comment and the post's commentCount are saved
    // together or not at all.
    return this.connection.transaction(async (session) => {
      // Counting first doubles as the check that the post is published, and
      // it conflicts with a post being deleted at the same time. Missing
      // posts and drafts both give 404, so nobody can tell that someone
      // else's draft exists.
      const counted = await this.postModel
        .updateOne(
          {
            _id: postId,
            status: PostStatus.Published,
            isHidden: { $ne: true },
          },
          { $inc: { commentCount: 1 } },
          { session },
        )
        .exec();
      if (counted.matchedCount === 0) {
        throw new NotFoundException('Post not found');
      }

      const [comment] = await this.commentModel.create(
        [
          {
            postId: new Types.ObjectId(postId),
            authorId: new Types.ObjectId(authorId),
            text: dto.text,
          },
        ],
        { session },
      );
      return comment;
    });
  }

  /** BLG-07: the author edits their own comment. */
  async update(authorId: string, commentId: string, dto: UpdateCommentDto) {
    const comment = await this.findOwnComment(authorId, commentId);
    comment.text = dto.text;
    return comment.save();
  }

  /** BLG-07: the author deletes their own comment. */
  async remove(authorId: string, commentId: string) {
    const comment = await this.findOwnComment(authorId, commentId);

    await this.connection.transaction(async (session) => {
      // Two requests at the same time: only the one that really deleted the
      // comment may lower the counter.
      const removed = await this.commentModel
        .deleteOne(
          { _id: comment._id, authorId: comment.authorId },
          { session },
        )
        .exec();
      if (removed.deletedCount === 0) {
        throw new NotFoundException('Comment not found');
      }

      // Never below 0, even if the counter was already wrong
      await this.postModel
        .updateOne(
          { _id: comment.postId, commentCount: { $gt: 0 } },
          { $inc: { commentCount: -1 } },
          { session },
        )
        .exec();
    });

    return { deleted: true, id: commentId };
  }

  /**
   * Finds a comment that must belong to the logged-in user.
   *  - does not exist                -> 404
   *  - someone else's comment        -> 403 (comments are public anyway)
   */
  private async findOwnComment(
    userId: string,
    commentId: string,
  ): Promise<CommentDocument> {
    const comment = await this.commentModel.findById(commentId).exec();
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.authorId.toString() !== userId) {
      throw new ForbiddenException('You can only change your own comments');
    }
    return comment;
  }
}
