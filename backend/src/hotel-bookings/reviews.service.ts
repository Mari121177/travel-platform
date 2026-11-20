import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { PageQueryDto } from './dto/queries.dto';
import { round2, todayString } from './date.util';
import { AccountStatus } from '../common/enums/account-status.enum';
import { User, UserDocument } from '../users/schemas/user.schema';
import { BookingStatus, PAGE_SIZE } from './hotel-booking.constants';
import { HotelsService } from '../hotels/hotels.service';
import { HotelBooking, HotelBookingDocument } from './schemas/hotel-booking.schema';
import { Review, ReviewDocument } from './schemas/review.schema';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(HotelBooking.name) private readonly bookingModel: Model<HotelBookingDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @Inject(forwardRef(() => HotelsService)) private readonly hotels: HotelsService,
  ) {}

  // HTL-23: one rating per Completed reservation
  async create(userId: string, bookingId: string, dto: CreateReviewDto) {
    const booking = await this.bookingModel.findOne({ _id: oid(bookingId), userId: oid(userId) });
    if (!booking) throw new NotFoundException('Reservation not found');
    if (booking.status !== BookingStatus.Confirmed || booking.checkOut >= todayString()) {
      throw new BadRequestException('You can only review a reservation after its check-out date');
    }
    if (await this.reviewModel.exists({ bookingId: booking._id })) {
      throw new ConflictException('This reservation already has a review');
    }
    let review: ReviewDocument;
    try {
      review = await this.reviewModel.create({
        bookingId: booking._id,
        userId: booking.userId,
        hotelId: booking.hotelId,
        rating: dto.rating,
        comment: dto.comment,
      });
    } catch (e) {
      if ((e as { code?: number }).code === 11000) {
        throw new ConflictException('This reservation already has a review');
      }
      throw e;
    }
    await this.recalculateRating(booking.hotelId);
    return review;
  }

  async update(userId: string, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.findOwned(userId, reviewId);
    if (dto.rating !== undefined) review.rating = dto.rating;
    if (dto.comment !== undefined) review.comment = dto.comment;
    await review.save();
    await this.recalculateRating(review.hotelId);
    return review;
  }

  async remove(userId: string, reviewId: string) {
    const review = await this.findOwned(userId, reviewId);
    await review.deleteOne();
    await this.recalculateRating(review.hotelId);
    return { deleted: true };
  }

  // HTL-24: public, newest first, paginated (hidden reviews excluded)
  async listForHotel(hotelId: string, query: PageQueryDto) {
    const page = query.page ?? 1;
    const filter = { hotelId: oid(hotelId), isHidden: false };
    const [reviews, total, summary] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      this.reviewModel.countDocuments(filter),
      this.ratingSummary(hotelId),
    ]);

    // ACC-12: a deactivated reviewer is shown as "Deleted user".
    const userIds = [...new Set(reviews.map((r) => String(r.userId)))];
    const users = userIds.length
      ? await this.userModel
          .find({ _id: { $in: userIds } })
          .select('name status')
          .lean()
          .exec()
      : [];
    const authorById = new Map(users.map((u) => [String(u._id), u]));
    const data = reviews.map((review) => {
      const author = authorById.get(String(review.userId));
      return {
        ...review,
        author: {
          _id: review.userId,
          name:
            author && author.status !== AccountStatus.Deactivated
              ? author.name
              : 'Deleted user',
        },
      };
    });

    return { ...summary, data, total, page, limit: PAGE_SIZE };
  }

  async ratingSummary(hotelId: string | Types.ObjectId) {
    const [row] = await this.reviewModel.aggregate<{ avg: number; count: number }>([
      { $match: { hotelId: oid(hotelId), isHidden: false } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    return {
      ratingAvg: row ? Math.round(row.avg * 10) / 10 : 0,
      ratingCount: row?.count ?? 0,
    };
  }

  // ---- for Mariam's moderation (GEN-10): hide / unhide / delete + rating refresh ----
  async setHidden(reviewId: string, hidden: boolean) {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) throw new NotFoundException('Review not found');
    review.isHidden = hidden;
    await review.save();
    await this.recalculateRating(review.hotelId);
    return review;
  }

  async deleteAsAdmin(reviewId: string) {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) throw new NotFoundException('Review not found');
    await review.deleteOne();
    await this.recalculateRating(review.hotelId);
    return { deleted: true };
  }

  // ---- private ----
  /** Recompute from scratch (no incremental drift / races). */
  private async recalculateRating(hotelId: Types.ObjectId) {
    const { ratingAvg, ratingCount } = await this.ratingSummary(hotelId);
    await this.hotels.updateRating(String(hotelId), round2(ratingAvg), ratingCount);
  }

  private async findOwned(userId: string, reviewId: string) {
    const review = await this.reviewModel.findOne({ _id: oid(reviewId), userId: oid(userId) });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }
}
