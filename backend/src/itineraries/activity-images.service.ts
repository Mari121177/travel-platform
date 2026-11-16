import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { findUrlByImageId, imageIdFromUrl } from '../uploads/image-url';
import { UploadsService } from '../uploads/uploads.service';
import type { UploadedImage } from '../uploads/uploads.service';
import { ItinerariesService } from './itineraries.service';
import { Activity, ActivityDocument } from './schemas/activity.schema';

// GEN-08: up to 5 images per activity
export const ACTIVITY_MAX_IMAGES = 5;

/**
 * ITN-12: attach and remove the images of an activity. Only the owner of the
 * itinerary may do it. Someone else's private itinerary gives 404, their
 * public one gives 403 (same as ITN-01).
 */
@Injectable()
export class ActivityImagesService {
  private readonly logger = new Logger(ActivityImagesService.name);

  constructor(
    @InjectModel(Activity.name)
    private readonly activityModel: Model<ActivityDocument>,
    private readonly itinerariesService: ItinerariesService,
    private readonly uploadsService: UploadsService,
  ) {}

  async add(id: string, user: AuthUser, file?: UploadedImage) {
    const activity = await this.getOwnedActivity(id, user);
    if (activity.images.length >= ACTIVITY_MAX_IMAGES) {
      throw new BadRequestException(
        `An activity can have at most ${ACTIVITY_MAX_IMAGES} images`,
      );
    }

    // Checks the file (JPG or PNG, 5 MB, real image) and stores it
    const saved = await this.uploadsService.saveImage(file);

    // The same check again, inside ONE atomic update, so two uploads at the
    // same time cannot push the activity over 5 images
    const updated = await this.activityModel
      .findOneAndUpdate(
        {
          _id: activity._id,
          $expr: {
            $lt: [{ $size: { $ifNull: ['$images', []] } }, ACTIVITY_MAX_IMAGES],
          },
        },
        { $push: { images: saved.url } },
        { new: true },
      )
      .exec();
    if (!updated) {
      await this.deleteUnusedFiles([saved.url]);
      throw new BadRequestException(
        `An activity can have at most ${ACTIVITY_MAX_IMAGES} images`,
      );
    }

    return {
      imageId: imageIdFromUrl(saved.url),
      url: saved.url,
      images: updated.images,
    };
  }

  async remove(id: string, imageId: string, user: AuthUser) {
    const activity = await this.getOwnedActivity(id, user);
    const url = findUrlByImageId(activity.images, imageId);
    if (!url) {
      throw new NotFoundException('Image not found');
    }

    const result = await this.activityModel
      .updateOne({ _id: activity._id }, { $pull: { images: url } })
      .exec();
    if (result.modifiedCount === 0) {
      throw new NotFoundException('Image not found');
    }
    await this.deleteUnusedFiles([url]);
    return { deleted: true, imageId };
  }

  /**
   * Delete the files of images that no activity uses any more. A file that is
   * still used by another activity (for example in a clone) is kept. Failing to
   * delete a file never undoes what the user did, it is only logged.
   */
  async deleteUnusedFiles(urls: string[]) {
    const results = await Promise.allSettled(
      urls.map(async (url) => {
        const stillUsed = await this.activityModel
          .exists({ images: url })
          .exec();
        if (!stillUsed) {
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

  private async getOwnedActivity(
    id: string,
    user: AuthUser,
  ): Promise<ActivityDocument> {
    const activity = await this.activityModel.findById(id).exec();
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }
    await this.itinerariesService.getOwnedOrFail(
      activity.itineraryId.toString(),
      user,
    );
    return activity;
  }
}
