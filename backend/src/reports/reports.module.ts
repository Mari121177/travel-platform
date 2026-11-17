import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminModule } from '../admin/admin.module';
import { BlogModule } from '../blog/blog.module';
import { Comment, CommentSchema } from '../blog/schemas/comment.schema';
import { Like, LikeSchema } from '../blog/schemas/like.schema';
import { Post, PostSchema } from '../blog/schemas/post.schema';
import { Review, ReviewSchema } from '../hotel-bookings/schemas/review.schema';
import { Activity, ActivitySchema } from '../itineraries/schemas/activity.schema';
import {
  BudgetEntry,
  BudgetEntrySchema,
} from '../itineraries/schemas/budget-entry.schema';
import { Itinerary, ItinerarySchema } from '../itineraries/schemas/itinerary.schema';
import {
  TransportCost,
  TransportCostSchema,
} from '../itineraries/schemas/transport-cost.schema';
import { AdminReportsController } from './admin-reports.controller';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Report, ReportSchema } from './schemas/report.schema';

// GEN-09/GEN-10: user reports plus admin moderation.
@Module({
  imports: [
    AdminModule,
    BlogModule,
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: Post.name, schema: PostSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Like.name, schema: LikeSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Itinerary.name, schema: ItinerarySchema },
      { name: Activity.name, schema: ActivitySchema },
      { name: BudgetEntry.name, schema: BudgetEntrySchema },
      { name: TransportCost.name, schema: TransportCostSchema },
    ]),
  ],
  controllers: [ReportsController, AdminReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
