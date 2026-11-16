import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadsModule } from '../uploads/uploads.module';
import { UsersModule } from '../users/users.module';
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
    // The public pages show the name of the author (BLG-02)
    UsersModule,
    // BLG-10: post images are stored by the upload code (GEN-08)
    UploadsModule,
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Like.name, schema: LikeSchema },
    ]),
  ],
  // BlogController must stay BEFORE PublicBlogController: it has
  // "GET /posts/mine", and PublicBlogController has "GET /posts/:id"
  controllers: [
    BlogController,
    PostImagesController,
    PublicBlogController,
    TagsController,
    CommentsController,
    LikesController,
  ],
  providers: [
    BlogService,
    CommentsService,
    LikesService,
    PublicBlogService,
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
