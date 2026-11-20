import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';

/**
 * How other teammates use notifications:
 *   1. In your module:  imports: [NotificationsModule]
 *   2. In your service: constructor(private readonly notificationsService: NotificationsService) {}
 *   3. Call:            await this.notificationsService.send(userId, NotificationType.X, 'message');
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
