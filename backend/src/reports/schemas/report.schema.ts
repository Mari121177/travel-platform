import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import {
  ReportResolution,
  ReportStatus,
  ReportTargetType,
} from '../report.constants';

export type ReportDocument = HydratedDocument<Report>;

@Schema({ timestamps: true, collection: 'reports' })
export class Report {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true, index: true })
  reporterId!: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(ReportTargetType), required: true })
  targetType!: ReportTargetType;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  targetId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 1000 })
  reason!: string;

  @Prop({
    type: String,
    enum: Object.values(ReportStatus),
    default: ReportStatus.Open,
    index: true,
  })
  status!: ReportStatus;

  @Prop({
    type: String,
    enum: Object.values(ReportResolution),
    default: null,
  })
  resolution!: ReportResolution | null;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', default: null })
  resolvedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  resolvedAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

// GEN-09: one report per user per item.
ReportSchema.index(
  { reporterId: 1, targetType: 1, targetId: 1 },
  { unique: true },
);
// GEN-10: admin list, newest first.
ReportSchema.index({ status: 1, createdAt: -1 });
