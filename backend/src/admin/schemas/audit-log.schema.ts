import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuditAction } from '../audit-action';

export type AuditLogDocument = HydratedDocument<AuditLog>;

// GEN-07: one record per admin action. Records are only ever added, never
// edited or deleted. Never store passwords or tokens in details.
@Schema({
  collection: 'auditlogs',
  timestamps: { createdAt: true, updatedAt: false },
})
export class AuditLog {
  // The admin who did it. The email is copied so the log stays readable.
  @Prop({ type: Types.ObjectId, required: true })
  adminId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  adminEmail!: string;

  @Prop({ type: String, enum: Object.values(AuditAction), required: true })
  action!: AuditAction;

  // What it was done to, for example "user"
  @Prop({ required: true, trim: true })
  targetType!: string;

  @Prop({ required: true, trim: true })
  targetId!: string;

  // A readable name of the target, for example the account's email
  @Prop({ type: String, trim: true })
  targetLabel?: string;

  @Prop({ type: Object, default: {} })
  details!: Record<string, unknown>;

  // Added by timestamps
  createdAt?: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// The list is shown newest first and can be filtered by action or target
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ targetId: 1, createdAt: -1 });
