import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { NotificationType } from '../notification-type.enum';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  /** The user who receives the notification. */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(NotificationType),
    required: true,
  })
  type!: NotificationType;

  @Prop({ type: String, required: true, trim: true, maxlength: 500 })
  message!: string;

  /** Optional extra info for the frontend, e.g. { bookingType: 'flight', bookingId: '...' }. */
  @Prop({ type: SchemaTypes.Mixed, default: undefined })
  data?: Record<string, unknown>;

  @Prop({ type: Boolean, default: false })
  isRead!: boolean;

  @Prop({ type: Date, default: null })
  readAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Fast "my notifications, newest first" and "my unread count" queries.
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
