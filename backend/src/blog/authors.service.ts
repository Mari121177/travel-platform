import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AccountStatus } from '../common/enums/account-status.enum';
import { Role } from '../common/enums/role.enum';
import {
  Itinerary,
  ItineraryVisibility,
} from '../itineraries/schemas/itinerary.schema';
import { User } from '../users/schemas/user.schema';
import { BLOG_PAGE_SIZE } from './blog.constants';
import { AuthorPageQueryDto } from './dto/author-page-query.dto';
import { PostStatus } from './post-status.enum';
import { POST_EXCERPT_LENGTH } from './public-blog.constants';
import { Post } from './schemas/post.schema';

interface AuthorRow {
  _id: Types.ObjectId;
  name: string;
  role: Role;
  status: AccountStatus;
  createdAt: Date;
}

const pageOf = <T>(items: T[], total: number, page: number) => ({
  items,
  page,
  limit: BLOG_PAGE_SIZE,
  total,
  totalPages: Math.ceil(total / BLOG_PAGE_SIZE),
});

/**
 * BLG-12: the public author page: name, join date, published posts and public
 * itineraries. Open to guests. Hidden content (GEN-10) and drafts or private
 * itineraries are never listed. A deactivated user has no page (ACC-12).
 */
@Injectable()
export class AuthorsService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    @InjectModel(Itinerary.name)
    private readonly itineraryModel: Model<Itinerary>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async getPage(authorId: string, query: AuthorPageQueryDto) {
    const author = await this.userModel
      .findById(authorId)
      .select('name role status createdAt')
      .lean<AuthorRow>()
      .exec();
    // Only travellers write posts and itineraries, so staff accounts have no
    // page. Suspended users keep their page (ACC-16).
    if (
      !author ||
      author.role !== Role.User ||
      author.status === AccountStatus.Deactivated
    ) {
      throw new NotFoundException('Author not found');
    }

    const postsPage = query.postsPage ?? 1;
    const itinerariesPage = query.itinerariesPage ?? 1;
    const limit = BLOG_PAGE_SIZE;

    const postFilter = {
      authorId: author._id,
      status: PostStatus.Published,
      isHidden: { $ne: true },
    };
    const itineraryFilter = {
      ownerId: author._id,
      visibility: ItineraryVisibility.Public,
      isHidden: { $ne: true },
    };

    const [posts, totalPosts, itineraries, totalItineraries] =
      await Promise.all([
        this.postModel
          .find(postFilter)
          .sort({ publishedAt: -1, _id: -1 })
          .skip((postsPage - 1) * limit)
          .limit(limit)
          .lean()
          .exec(),
        this.postModel.countDocuments(postFilter).exec(),
        this.itineraryModel
          .find(itineraryFilter)
          .sort({ updatedAt: -1, _id: -1 })
          .skip((itinerariesPage - 1) * limit)
          .limit(limit)
          .lean()
          .exec(),
        this.itineraryModel.countDocuments(itineraryFilter).exec(),
      ]);

    return {
      author: {
        _id: author._id,
        name: author.name,
        joinedAt: author.createdAt,
      },
      posts: pageOf(
        posts.map((post) => ({
          _id: post._id,
          title: post.title,
          excerpt: post.body.slice(0, POST_EXCERPT_LENGTH),
          tags: post.tags,
          publishedAt: post.publishedAt,
          likeCount: post.likeCount,
          commentCount: post.commentCount,
          coverImage: post.images?.[0],
        })),
        totalPosts,
        postsPage,
      ),
      itineraries: pageOf(
        itineraries.map((itinerary) => ({
          _id: itinerary._id,
          title: itinerary.title,
          countries: itinerary.countries,
          startDate: itinerary.startDate,
          dayCount: itinerary.days?.length ?? 0,
          updatedAt: itinerary.updatedAt,
        })),
        totalItineraries,
        itinerariesPage,
      ),
    };
  }
}
