import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BLOG_PAGE_SIZE } from './blog.constants';
import { Comment } from './schemas/comment.schema';
import { Like } from './schemas/like.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { ListMyPostsQueryDto } from './dto/list-my-posts-query.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostStatus } from './post-status.enum';
import { Post, PostDocument } from './schemas/post.schema';

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(Comment.name) private readonly commentModel: Model<Comment>,
    @InjectModel(Like.name) private readonly likeModel: Model<Like>,
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
  ) {}

  /** BLG-01: create a post as a draft (default) or published. */
  async create(authorId: string, dto: CreatePostDto) {
    const status = dto.status ?? PostStatus.Draft;
    return this.postModel.create({
      authorId: new Types.ObjectId(authorId),
      title: dto.title,
      body: dto.body,
      tags: dto.tags ?? [],
      images: dto.images ?? [],
      status,
      publishedAt: status === PostStatus.Published ? new Date() : null,
    });
  }

  /** BLG-03: my own posts, drafts included, newest first, 10 per page. */
  async findMine(authorId: string, query: ListMyPostsQueryDto) {
    const page = query.page ?? 1;
    const limit = BLOG_PAGE_SIZE;
    // page=1e308 passes the DTO but makes the skip value Infinity
    if (!Number.isSafeInteger((page - 1) * limit)) {
      throw new BadRequestException('page is too large');
    }
    const filter: Record<string, unknown> = {
      authorId: new Types.ObjectId(authorId),
    };
    if (query.status) {
      filter.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.postModel
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('title status createdAt publishedAt likeCount commentCount')
        .lean()
        .exec(),
      this.postModel.countDocuments(filter).exec(),
    ]);

    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  /** BLG-04: the author edits their own post. Only the fields sent change. */
  async update(authorId: string, postId: string, dto: UpdatePostDto) {
    // @IsOptional() lets null through, so reject explicit nulls here
    for (const [field, value] of Object.entries(dto)) {
      if (value === null) {
        throw new BadRequestException(`${field} cannot be null`);
      }
    }

    const post = await this.findOwnPost(authorId, postId);

    if (dto.title !== undefined) post.title = dto.title;
    if (dto.body !== undefined) post.body = dto.body;
    if (dto.tags !== undefined) post.tags = dto.tags;
    if (dto.images !== undefined) post.images = dto.images;
    if (dto.status !== undefined) {
      post.status = dto.status;
    }
    await post.save();

    // publishedAt records the first time the post was published. It is set
    // with a conditional update (only while it is still null), so two
    // publish requests at the same time cannot overwrite each other's date.
    if (dto.status === PostStatus.Published && !post.publishedAt) {
      await this.postModel
        .updateOne(
          { _id: post._id, publishedAt: null },
          { $set: { publishedAt: new Date() } },
        )
        .exec();
      const fresh = await this.postModel.findById(post._id).exec();
      if (!fresh) {
        throw new NotFoundException('Post not found');
      }
      return fresh;
    }
    return post;
  }

  /** BLG-04: the author deletes their own post. */
  async remove(authorId: string, postId: string) {
    const post = await this.findOwnPost(authorId, postId);
    // TODO GEN-08: UploadsService.deleteByUrl() for each image, once #16 is merged
    await post.deleteOne();
    await this.commentModel.deleteMany({ postId: post._id }).exec();
    await this.likeModel.deleteMany({ postId: post._id }).exec();
    return { deleted: true, id: postId };
  }

  /**
   * Finds a post that must belong to the logged-in user.
   *  - does not exist                         -> 404
   *  - someone else's DRAFT                   -> 404 (nobody can tell it exists)
   *  - someone else's PUBLISHED post          -> 403 (it is public anyway)
   */
  private async findOwnPost(
    userId: string,
    postId: string,
  ): Promise<PostDocument> {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('id must be a valid id');
    }
    const post = await this.postModel.findById(postId).exec();
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.authorId.toString() !== userId) {
      if (post.status === PostStatus.Draft) {
        throw new NotFoundException('Post not found');
      }
      throw new ForbiddenException('You can only change your own posts');
    }
    return post;
  }
}
