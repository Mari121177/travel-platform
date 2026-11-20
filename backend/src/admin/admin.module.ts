import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AirlinesModule } from '../airlines/airlines.module';
import { FlightBooking, FlightBookingSchema } from '../flight-bookings/schemas/flight-booking.schema';
import { HotelBooking, HotelBookingSchema } from '../hotel-bookings/schemas/hotel-booking.schema';
import { HotelsModule } from '../hotels/hotels.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { AdminAccountsController } from './admin-accounts.controller';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminAccountsService } from './admin-accounts.service';
import { AdminBookingsController } from './admin-bookings.controller';
import { AdminBookingsService } from './admin-bookings.service';
import { AdminProvidersController } from './admin-providers.controller';
import { AdminProvidersService } from './admin-providers.service';
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
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: HotelBooking.name, schema: HotelBookingSchema },
      { name: FlightBooking.name, schema: FlightBookingSchema },
    ]),
  ],
  controllers: [
    AdminAccountsController,
    AdminAnalyticsController,
    AdminBookingsController,
    AdminProvidersController,
    AuditLogsController,
  ],
  providers: [
    AdminAccountsService,
    AdminAnalyticsService,
    AdminBookingsService,
    AdminProvidersService,
    AuditLogService,
    AdminSeeder,
  ],
  exports: [AuditLogService],
})
export class AdminModule {}
