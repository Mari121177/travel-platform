import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AirlinesModule } from '../airlines/airlines.module';
import { HotelsModule } from '../hotels/hotels.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { AdminAccountsController } from './admin-accounts.controller';
import { AdminBookingsController } from './admin-bookings.controller';
import { AdminBookingsService } from './admin-bookings.service';
import { AdminAccountsService } from './admin-accounts.service';
import { AdminSeeder } from './admin.seeder';
import { AuditLogService } from './audit-log.service';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';

// Administration. UsersModule exports the User model, so no second User schema.
@Module({
  imports: [
    UsersModule,
    NotificationsModule,
    HotelsModule,
    AirlinesModule,
    MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }]),
  ],
  controllers: [
    AdminAccountsController,
    AdminBookingsController,
    AuditLogsController,
  ],
  providers: [
    AdminAccountsService,
    AdminBookingsService,
    AuditLogService,
    AdminSeeder,
  ],
  exports: [AuditLogService],
})
export class AdminModule {}
