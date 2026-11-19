import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditAction } from '../admin/audit-action';
import { AuditLogService } from '../admin/audit-log.service';
import { PostImagesService } from '../blog/post-images.service';
import { Post } from '../blog/schemas/post.schema';
import { Comment } from '../blog/schemas/comment.schema';
import { Like } from '../blog/schemas/like.schema';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ReviewsService } from '../hotel-bookings/reviews.service';
import { Review } from '../hotel-bookings/schemas/review.schema';
import { Activity } from '../itineraries/schemas/activity.schema';
import { BudgetEntry } from '../itineraries/schemas/budget-entry.schema';
import { Itinerary } from '../itineraries/schemas/itinerary.schema';
import { TransportCost } from '../itineraries/schemas/transport-cost.schema';
import { CreateReportDto } from './dto/create-report.dto';
import { ListReportsQueryDto } from './dto/list-reports-query.dto';
import { ResolveAction, ResolveReportDto } from './dto/resolve-report.dto';
import {
  PAGE_SIZE,
  ReportResolution,
  ReportStatus,
  ReportTargetType,
} from './report.constants';
import { Report } from './schemas/report.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name) private readonly reportModel: Model<Report>,
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    @InjectModel(Comment.name) private readonly commentModel: Model<Comment>,
    @InjectModel(Like.name) private readonly likeModel: Model<Like>,
    @InjectModel(Review.name) private readonly reviewModel: Model<Review>,
    @InjectModel(Itinerary.name) private readonly itineraryModel: Model<Itinerary>,
    @InjectModel(Activity.name) private readonly activityModel: Model<Activity>,
    @InjectModel(BudgetEntry.name)
    private readonly budgetModel: Model<BudgetEntry>,
    @InjectModel(TransportCost.name)
    private readonly transportModel: Model<TransportCost>,
    private readonly reviewsService: ReviewsService,
    private readonly postImagesService: PostImagesService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // GEN-09: a registered user reports one item, at most once.
  async create(reporterId: string, dto: CreateReportDto) {
    await this.getTarget(dto.targetType, dto.targetId);

    try {
      return await this.reportModel.create({
        reporterId: new Types.ObjectId(reporterId),
        targetType: dto.targetType,
        targetId: new Types.ObjectId(dto.targetId),
        reason: dto.reason,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException('You have already reported this item');
      }
      throw error;
    }
  }

  // GEN-10: all reports, open by default, newest first, 10 per page.
  async list(query: ListReportsQueryDto) {
    const page = query.page ?? 1;
    const filter: Record<string, unknown> = { status: query.status };
    if (query.targetType) filter.targetType = query.targetType;

    const [items, total] = await Promise.all([
      this.reportModel
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean()
        .exec(),
      this.reportModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      page,
      limit: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  }

  async findOne(reportId: string) {
    const report = await this.reportModel.findById(reportId).lean().exec();
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  // GEN-10: dismiss, hide the reported content, or delete it.
  async resolve(admin: AuthUser, reportId: string, dto: ResolveReportDto) {
    const report = await this.reportModel.findById(reportId).exec();
    if (!report) throw new NotFoundException('Report not found');
    if (report.status === ReportStatus.Resolved) {
      throw new ConflictException('This report has already been resolved');
    }

    let resolution: ReportResolution;
    let targetLabel: string;

    if (dto.action === ResolveAction.Dismiss) {
      resolution = ReportResolution.Dismissed;
      // The content may already be gone; a report can still be dismissed.
      try {
        targetLabel = (
          await this.getTarget(report.targetType, String(report.targetId))
        ).label;
      } catch {
        targetLabel = `Deleted ${report.targetType}`;
      }
      await this.auditLogService.record({
        admin,
        action: AuditAction.DismissReport,
        targetType: report.targetType,
        targetId: String(report.targetId),
        targetLabel,
        details: { reportId },
      });
    } else if (dto.action === ResolveAction.Hide) {
      const target = await this.setContentHidden(
        report.targetType,
        String(report.targetId),
        true,
      );
      resolution = ReportResolution.Hidden;
      targetLabel = target.label;
      await this.auditLogService.record({
        admin,
        action: AuditAction.HideContent,
        targetType: report.targetType,
        targetId: String(report.targetId),
        targetLabel,
        details: { reportId },
      });
    } else {
      const target = await this.deleteContent(
        report.targetType,
        String(report.targetId),
      );
      resolution = ReportResolution.Deleted;
      targetLabel = target.label;
      await this.auditLogService.record({
        admin,
        action: AuditAction.DeleteContent,
        targetType: report.targetType,
        targetId: String(report.targetId),
        targetLabel,
        details: { reportId },
      });
    }

    report.status = ReportStatus.Resolved;
    report.resolution = resolution;
    report.resolvedBy = new Types.ObjectId(admin.id);
    report.resolvedAt = new Date();
    await report.save();
    return report;
  }

  // GEN-10: direct admin hide, outside a report.
  async hideContentDirect(
    admin: AuthUser,
    type: ReportTargetType,
    id: string,
  ) {
    const target = await this.setContentHidden(type, id, true);
    await this.auditLogService.record({
      admin,
      action: AuditAction.HideContent,
      targetType: type,
      targetId: id,
      targetLabel: target.label,
    });
    return { type, id, isHidden: true };
  }

  // GEN-10: direct admin delete, outside a report.
  async deleteContentDirect(
    admin: AuthUser,
    type: ReportTargetType,
    id: string,
  ) {
    const target = await this.deleteContent(type, id);
    await this.auditLogService.record({
      admin,
      action: AuditAction.DeleteContent,
      targetType: type,
      targetId: id,
      targetLabel: target.label,
    });
    return { type, id, deleted: true };
  }

  // ---- content operations ----

  private async setContentHidden(
    type: ReportTargetType,
    id: string,
    isHidden: boolean,
  ): Promise<{ label: string }> {
    const target = await this.getTarget(type, id);

    if (type === ReportTargetType.Review) {
      await this.reviewsService.setHidden(id, isHidden);
    } else {
      const model = this.modelFor(type);
      const result = await model.updateOne({ _id: id }, { $set: { isHidden } }).exec();
      if (result.matchedCount === 0) throw new NotFoundException('Content not found');
    }

    return { label: target.label };
  }

  private async deleteContent(
    type: ReportTargetType,
    id: string,
  ): Promise<{ label: string }> {
    const target = await this.getTarget(type, id);

    if (type === ReportTargetType.Review) {
      await this.reviewsService.deleteAsAdmin(id);
      return { label: target.label };
    }

    if (type === ReportTargetType.Post) {
      const post = await this.postModel.findById(id).lean().exec();
      await Promise.all([
        this.commentModel.deleteMany({ postId: id }).exec(),
        this.likeModel.deleteMany({ postId: id }).exec(),
      ]);
      await this.postModel.deleteOne({ _id: id }).exec();
      if (post?.images?.length) {
        await this.postImagesService.deleteUnusedFiles(post.images);
      }
      return { label: target.label };
    }

    if (type === ReportTargetType.Comment) {
      const comment = await this.commentModel.findById(id).lean().exec();
      await this.commentModel.deleteOne({ _id: id }).exec();
      if (comment) {
        await this.postModel
          .updateOne(
            { _id: comment.postId, commentCount: { $gt: 0 } },
            { $inc: { commentCount: -1 } },
          )
          .exec();
      }
      return { label: target.label };
    }

    // itinerary
    await Promise.all([
      this.itineraryModel.deleteOne({ _id: id }).exec(),
      this.activityModel.deleteMany({ itineraryId: id }).exec(),
      this.budgetModel.deleteMany({ itineraryId: id }).exec(),
      this.transportModel.deleteMany({ itineraryId: id }).exec(),
    ]);
    return { label: target.label };
  }

  private modelFor(type: ReportTargetType): Model<unknown> {
    switch (type) {
      case ReportTargetType.Post:
        return this.postModel as unknown as Model<unknown>;
      case ReportTargetType.Comment:
        return this.commentModel as unknown as Model<unknown>;
      case ReportTargetType.Itinerary:
        return this.itineraryModel as unknown as Model<unknown>;
      default:
        return this.reviewModel as unknown as Model<unknown>;
    }
  }

  private async getTarget(
    type: ReportTargetType,
    id: string,
  ): Promise<{ label: string }> {
    if (type === ReportTargetType.Post) {
      const post = await this.postModel.findById(id).select('title').lean().exec();
      if (!post) throw new NotFoundException('Post not found');
      return { label: post.title };
    }
    if (type === ReportTargetType.Comment) {
      const comment = await this.commentModel.findById(id).select('text').lean().exec();
      if (!comment) throw new NotFoundException('Comment not found');
      return { label: comment.text.slice(0, 100) };
    }
    if (type === ReportTargetType.Review) {
      const review = await this.reviewModel.findById(id).select('rating comment').lean().exec();
      if (!review) throw new NotFoundException('Review not found');
      return { label: review.comment?.slice(0, 100) ?? `Rating ${review.rating}` };
    }
    const itinerary = await this.itineraryModel.findById(id).select('title').lean().exec();
    if (!itinerary) throw new NotFoundException('Itinerary not found');
    return { label: itinerary.title };
  }
}
