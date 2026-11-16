import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { findUrlByImageId, imageIdFromUrl } from '../uploads/image-url';
import { UploadsService } from '../uploads/uploads.service';
import type { UploadedImage } from '../uploads/uploads.service';
import { POST_MAX_IMAGES } from './blog.constants';
import { Activity } from '../itineraries/schemas/activity.schema';
import { PostStatus } from './post-status.enum';
import { Post, PostDocument } from './schemas/post.schema';

/**
 * BLG-10: attach and remove the images of a post (GEN-08: up to 5, JPG or PNG,
 * 5 MB each). Only the author may do it.
 */
@Injectable()
export class PostImagesService {
  private readonly logger = new Logger(PostImagesService.name);

  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    @InjectModel(Activity.name) private readonly activityModel: Model<Activity>,
    private readonly uploadsService: UploadsService,
  ) {}

  async add(userId: string, postId: string, file?: UploadedImage) {
    const post = await this.findOwnPost(userId, postId);
    if (post.images.length >= POST_MAX_IMAGES) {
      throw new BadRequestException(
        `A post can have at most ${POST_MAX_IMAGES} images`,
      );
    }

    // Checks the file (JPG or PNG, 5 MB, real image) and stores it
    const saved = await this.uploadsService.saveImage(file);

    // The same check again, inside ONE atomic update, so two uploads at the
    // same time cannot push the post over 5 images
    const updated = await this.postModel
      .findOneAndUpdate(
        {
          _id: post._id,
          authorId: post.authorId,
          $expr: {
            $lt: [{ $size: { $ifNull: ['$images', []] } }, POST_MAX_IMAGES],
          },
        },
        { $push: { images: saved.url } },
        { new: true },
      )
      .exec();
    if (!updated) {
      await this.deleteUnusedFiles([saved.url]);
      throw new BadRequestException(
        `A post can have at most ${POST_MAX_IMAGES} images`,
      );
    }

    return {
      imageId: imageIdFromUrl(saved.url),
      url: saved.url,
      images: updated.images,
    };
  }

  async remove(userId: string, postId: string, imageId: string) {
    const post = await this.findOwnPost(userId, postId);
    const url = findUrlByImageId(post.images, imageId);
    if (!url) {
      throw new NotFoundException('Image not found');
    }

    const result = await this.postModel
      .updateOne({ _id: post._id }, { $pull: { images: url } })
      .exec();
    if (result.modifiedCount === 0) {
      throw new NotFoundException('Image not found');
    }
    await this.deleteUnusedFiles([url]);
    return { deleted: true, imageId };
  }

  /**
   * Delete the files of images that no post uses any more. Failing to delete a
   * file never undoes what the user did, it is only logged.
   * BlogService calls this when a post is deleted.
   */
  async deleteUnusedFiles(urls: string[]) {
    const results = await Promise.allSettled(
      urls.map(async (url) => {
        const [usedByPost, usedByActivity] = await Promise.all([
          this.postModel.exists({ images: url }).exec(),
          this.activityModel.exists({ images: url }).exec(),
        ]);
        if (!usedByPost && !usedByActivity) {
          await this.uploadsService.deleteByUrl(url);
        }
      }),
    );
    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.warn(
          `Could not delete an image file: ${String(result.reason)}`,
        );
      }
    }
  }

  // Same rules as BlogService: someone else's draft is a 404, someone else's
  // published post is a 403
  private async findOwnPost(
    userId: string,
    postId: string,
  ): Promise<PostDocument> {
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
