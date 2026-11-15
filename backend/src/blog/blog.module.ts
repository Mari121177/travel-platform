import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Itinerary,
  ItinerarySchema,
} from '../itineraries/schemas/itinerary.schema';
import { UsersModule } from '../users/users.module';
import { AuthorsController } from './authors.controller';
import { AuthorsService } from './authors.service';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';
import { PublicBlogController, TagsController } from './public-blog.controller';
import { PublicBlogService } from './public-blog.service';
import { Comment, CommentSchema } from './schemas/comment.schema';
import { Like, LikeSchema } from './schemas/like.schema';
import { Post, PostSchema } from './schemas/post.schema';

@Module({
  imports: [
    // The public pages show the name of the author (BLG-02)
    UsersModule,
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Like.name, schema: LikeSchema },
      // BLG-12: the author page lists the author's public itineraries
      { name: Itinerary.name, schema: ItinerarySchema },
    ]),
  ],
  // BlogController must stay BEFORE PublicBlogController: it has
  // "GET /posts/mine", and PublicBlogController has "GET /posts/:id"
  controllers: [
    BlogController,
    PublicBlogController,
    TagsController,
    CommentsController,
    LikesController,
    AuthorsController,
  ],
  providers: [
    BlogService,
    CommentsService,
    LikesService,
    PublicBlogService,
    AuthorsService,
  ],
  exports: [
    BlogService,
    CommentsService,
    LikesService,
    PublicBlogService,
    MongooseModule,
  ],
})
export class BlogModule {}
