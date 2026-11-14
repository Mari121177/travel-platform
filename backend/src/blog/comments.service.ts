import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { PostStatus } from './post-status.enum';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { Post } from './schemas/post.schema';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private readonly commentModel: Model<Comment>,
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
  ) {}

  /** BLG-05: comment on a published post. */
  async create(authorId: string, postId: string, dto: CreateCommentDto) {
    // Missing posts and drafts both give 404, so nobody can tell that
    // someone else's draft exists.
    const post = await this.postModel
      .exists({ _id: postId, status: PostStatus.Published })
      .exec();
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const comment = await this.commentModel.create({
      postId: new Types.ObjectId(postId),
      authorId: new Types.ObjectId(authorId),
      text: dto.text,
    });

    // The counter on the post is changed atomically (shown in BLG-03)
    await this.postModel
      .updateOne({ _id: postId }, { $inc: { commentCount: 1 } })
      .exec();

    return comment;
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
    await comment.deleteOne();

    // Never below 0, even if the counter was already wrong
    await this.postModel
      .updateOne(
        { _id: comment.postId, commentCount: { $gt: 0 } },
        { $inc: { commentCount: -1 } },
      )
      .exec();

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