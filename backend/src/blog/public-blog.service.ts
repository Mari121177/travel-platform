import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { AccountStatus } from '../common/enums/account-status.enum';
import { User } from '../users/schemas/user.schema';
import { BLOG_PAGE_SIZE } from './blog.constants';
import { ListPostsQueryDto } from './dto/list-posts-query.dto';
import { PostStatus } from './post-status.enum';
import {
  DELETED_USER_NAME,
  POST_EXCERPT_LENGTH,
} from './public-blog.constants';
import { Comment } from './schemas/comment.schema';
import { Like } from './schemas/like.schema';
import { Post } from './schemas/post.schema';
import { Role } from '../common/enums/role.enum';

export interface PostListItem {
  _id: Types.ObjectId;
  title: string;
  excerpt: string;
  tags: string[];
  publishedAt: Date | null;
  likeCount: number;
  commentCount: number;
  coverImage?: string;
  author: { _id: Types.ObjectId; name: string };
}

export interface ListResult {
  items: PostListItem[];
  total: { n: number }[];
}

// Every character of the keyword is searched literally
const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * BLG-02, BLG-08, BLG-09: what guests and users can read. Only published posts
 * are listed, and posts of a user who deactivated their account are hidden
 * (ACC-12).
 */
@Injectable()
export class PublicBlogService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    @InjectModel(Comment.name) private readonly commentModel: Model<Comment>,
    @InjectModel(Like.name) private readonly likeModel: Model<Like>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  /**
   * BLG-02: published posts, newest first, 10 per page, optionally with one tag.
   * BLG-09: with a keyword (q) the posts that match in the title, the tags or
   * the author's name, ordered by likes plus comments (highest first), newest
   * first when the score is equal. No match gives an empty list.
   */
  async list(query: ListPostsQueryDto) {
    const page = query.page ?? 1;
    const limit = BLOG_PAGE_SIZE;
    const { tag, q } = query;

    const stages: PipelineStage[] = [
      // GEN-10: posts that an admin hid are left out of every list
      { $match: { status: PostStatus.Published, isHidden: { $ne: true } } },
      {
        $lookup: {
          from: this.userModel.collection.name,
          localField: 'authorId',
          foreignField: '_id',
          as: 'author',
        },
      },
      { $unwind: '$author' },
      // ACC-12: a deactivated user's posts are hidden
      { $match: { 'author.status': { $ne: AccountStatus.Deactivated } } },
    ];

    if (tag) {
      stages.push({ $match: { tags: tag } });
    }
    if (q) {
      const words = new RegExp(escapeRegExp(q), 'i');
      stages.push({
        $match: {
          $or: [{ title: words }, { tags: words }, { 'author.name': words }],
        },
      });
      stages.push({
        $addFields: { score: { $add: ['$likeCount', '$commentCount'] } },
      });
    }

    stages.push({
      $facet: {
        items: [
          {
            $sort: q
              ? { score: -1, publishedAt: -1, _id: -1 }
              : { publishedAt: -1, _id: -1 },
          },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              title: 1,
              excerpt: { $substrCP: ['$body', 0, POST_EXCERPT_LENGTH] },
              tags: 1,
              publishedAt: 1,
              likeCount: 1,
              commentCount: 1,
              coverImage: { $arrayElemAt: ['$images', 0] },
              author: { _id: '$author._id', name: '$author.name' },
            },
          },
        ],
        total: [{ $count: 'n' }],
      },
    });

    const [result] = await this.postModel.aggregate<ListResult>(stages).exec();
    const total = result?.total[0]?.n ?? 0;

    return {
      items: result?.items ?? [],
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      ...(total === 0 && q ? { message: 'No results' } : {}),
    };
  }

  /** BLG-08: the published posts that have a tag. */
  async listByTag(tag: string, page: number | undefined) {
    return { tag, ...(await this.list({ tag, page })) };
  }

  /**
   * BLG-02: the post page: title, author, date, body, tags, images, like count
   * and the comments (oldest first, 10 per page).
   * Anyone can open a published post. A draft can only be opened by its author,
   * and for everyone else it does not exist (404).
   */
  async findOne(
    postId: string,
    userId: string | undefined,
    commentsPage: number | undefined,
  ) {
    const post = await this.postModel.findById(postId).lean().exec();
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    const isAuthor =
      userId !== undefined && post.authorId.toString() === userId;
    const viewer = userId
      ? await this.userModel.findById(userId).select('role').lean().exec()
      : null;
    const isAdmin = viewer?.role === Role.Admin;
    if (post.status !== PostStatus.Published && !isAuthor) {
      throw new NotFoundException('Post not found');
    }
    // GEN-10: a hidden post is only for its author and admins
    if (post.isHidden && !isAuthor && !isAdmin) {
      throw new NotFoundException('Post not found');
    }

    const author = await this.userModel
      .findById(post.authorId)
      .select('name status')
      .lean()
      .exec();
    // ACC-12: a deactivated user's posts are hidden
    if (!author || author.status === AccountStatus.Deactivated) {
      throw new NotFoundException('Post not found');
    }

    const page = commentsPage ?? 1;
    const limit = BLOG_PAGE_SIZE;
    // GEN-10: hidden comments are only for their author and admins
    const filter: Record<string, unknown> = { postId: post._id };
    if (!isAdmin) {
      filter.$or = userId
        ? [
            { isHidden: { $ne: true } },
            { authorId: new Types.ObjectId(userId) },
          ]
        : [{ isHidden: { $ne: true } }];
    }
    const [comments, totalComments, liked] = await Promise.all([
      this.commentModel
        .find(filter)
        .sort({ createdAt: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.commentModel.countDocuments(filter).exec(),
      userId
        ? this.likeModel
            .exists({ postId: post._id, userId: new Types.ObjectId(userId) })
            .exec()
        : Promise.resolve(null),
    ]);

    // ACC-12: the comments of a deactivated user show as "Deleted user"
    const commenters = await this.userModel
      .find({
        _id: { $in: [...new Set(comments.map((c) => c.authorId.toString()))] },
      })
      .select('name status')
      .lean()
      .exec();
    const commenterById = new Map(commenters.map((u) => [u._id.toString(), u]));

    return {
      _id: post._id,
      title: post.title,
      body: post.body,
      tags: post.tags,
      images: post.images,
      status: post.status,
      publishedAt: post.publishedAt,
      itineraryId: post.itineraryId ?? null,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      likedByMe: liked !== null,
      author: { _id: author._id, name: author.name },
      comments: {
        items: comments.map((comment) => {
          const commenter = commenterById.get(comment.authorId.toString());
          const visible =
            commenter && commenter.status !== AccountStatus.Deactivated;
          return {
            _id: comment._id,
            text: comment.text,
            isHidden: comment.isHidden === true,
            createdAt: comment.createdAt,
            author: visible
              ? { _id: commenter._id, name: commenter.name }
              : { _id: null, name: DELETED_USER_NAME },
          };
        }),
        page,
        limit,
        total: totalComments,
        totalPages: Math.ceil(totalComments / limit),
      },
    };
  }
}
