import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadsModule } from '../uploads/uploads.module';
import { Activity, ActivitySchema } from '../itineraries/schemas/activity.schema';
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
import { PostImagesController } from './post-images.controller';
import { PostImagesService } from './post-images.service';
import { PublicBlogController, TagsController } from './public-blog.controller';
import { PublicBlogService } from './public-blog.service';
import { Comment, CommentSchema } from './schemas/comment.schema';
import { Like, LikeSchema } from './schemas/like.schema';
import { Post, PostSchema } from './schemas/post.schema';

@Module({
  imports: [
    UsersModule,
    UploadsModule,
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Like.name, schema: LikeSchema },
      { name: Itinerary.name, schema: ItinerarySchema },
      { name: Activity.name, schema: ActivitySchema },
    ]),
  ],
  controllers: [
    BlogController,
    PostImagesController,
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
    PostImagesService,
  ],
  exports: [
    BlogService,
    CommentsService,
    LikesService,
    PublicBlogService,
    PostImagesService,
    MongooseModule,
  ],
})
export class BlogModule {}
