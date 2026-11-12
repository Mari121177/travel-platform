import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationType } from './notification-type.enum';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';

type Id = string | Types.ObjectId;

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

/** GEN-05: every list is paginated with page size 10. */
const PAGE_SIZE = 10;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
  ) {}

  /**
   * Sends one in-app notification to one user. Other modules call this.
   *
   * Example:
   *   await this.notificationsService.send(
   *     booking.userId,
   *     NotificationType.BOOKING_CONFIRMED,
   *     `Your booking ${booking.reference} is confirmed.`,
   *     { bookingType: 'flight', bookingId: booking.id },
   *   );
   *
   * Never throws: a failed notification must not break the main action
   * (booking, payment, admin action). Failures are logged instead.
   */
  async send(
    userId: Id,
    type: NotificationType,
    message: string,
    data?: Record<string, unknown>,
  ): Promise<NotificationDocument | null> {
    try {
      if (!this.isObjectId(userId)) {
        throw new Error('invalid userId');
      }
      return await this.notificationModel.create({
        userId: new Types.ObjectId(String(userId)),
        type,
        message,
        data,
      });
    } catch (err) {
      this.logger.error(
        `Could not send ${type} notification to user ${String(userId)}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Sends the same notification to many users, e.g. everyone affected
   * when an admin deactivates an airline or hotel (ACC-15).
   * Returns how many notifications were created. Never throws.
   */
  async sendMany(
    userIds: Id[],
    type: NotificationType,
    message: string,
    data?: Record<string, unknown>,
  ): Promise<number> {
    const uniqueIds = [...new Set(userIds.map((id) => String(id)))].filter(
      (id) => this.isObjectId(id),
    );
    if (uniqueIds.length === 0) {
      return 0;
    }
    try {
      const created = await this.notificationModel.insertMany(
        uniqueIds.map((id) => ({
          userId: new Types.ObjectId(id),
          type,
          message,
          data,
        })),
      );
      return created.length;
    } catch (err) {
      this.logger.error(
        `Could not send ${type} notifications to ${uniqueIds.length} users: ${(err as Error).message}`,
      );
      return 0;
    }
  }

  /** GEN-01: number for the unread badge. */
  async getUnreadCount(userId: string) {
    const owner = this.parseId(userId, 'userId');
    const unreadCount = await this.notificationModel
      .countDocuments({ userId: owner, isRead: false })
      .exec();
    return { unreadCount };
  }

  /** GEN-01: the logged-in user's notifications, newest first, 10 per page. */
  async findForUser(userId: string, query: ListNotificationsQueryDto) {
    const owner = this.parseId(userId, 'userId');
    const page = query.page ?? 1;
    const limit = PAGE_SIZE;
    const filter = query.unreadOnly
      ? { userId: owner, isRead: false }
      : { userId: owner };

    const [items, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.notificationModel.countDocuments(filter).exec(),
      this.notificationModel
        .countDocuments({ userId: owner, isRead: false })
        .exec(),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  /** Marks one notification as read. Users can only touch their own. */
  async markAsRead(userId: string, notificationId: string) {
    const owner = this.parseId(userId, 'userId');
    const id = this.parseId(notificationId, 'id');

    // Filtering by userId too means another user's notification gives 404,
    // so nobody can tell whether someone else's notification exists.
    const notification = await this.notificationModel
      .findOne({ _id: id, userId: owner })
      .exec();
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }
    return notification;
  }

  /** Marks all of the user's unread notifications as read. */
  async markAllAsRead(userId: string) {
    const owner = this.parseId(userId, 'userId');
    const result = await this.notificationModel
      .updateMany(
        { userId: owner, isRead: false },
        { $set: { isRead: true, readAt: new Date() } },
      )
      .exec();
    return { updated: result.modifiedCount };
  }

  private isObjectId(value: Id | undefined | null): boolean {
    return value != null && OBJECT_ID_REGEX.test(String(value));
  }

  private parseId(value: string, field: string): Types.ObjectId {
    if (!this.isObjectId(value)) {
      throw new BadRequestException(`${field} must be a valid id`);
    }
    return new Types.ObjectId(value);
  }
}
