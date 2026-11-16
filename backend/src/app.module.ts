import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { AirlinesModule } from './airlines/airlines.module';
import { FlightsModule } from './flights/flights.module';
import { FlightSearchModule } from './flights/search/flight-search.module';
import { FlightBookingsModule } from './flight-bookings/flight-bookings.module';
import { HotelsModule } from './hotels/hotels.module';
import { HotelBookingsModule } from './hotel-bookings/hotel-bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { ItinerariesModule } from './itineraries/itineraries.module';
import { BlogModule } from './blog/blog.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UploadsModule } from './uploads/uploads.module';
import { ReferenceDataModule } from './reference-data/reference-data.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    AuthModule,
    UsersModule,
    AdminModule,
    AirlinesModule,
    FlightsModule,
    FlightSearchModule,
    FlightBookingsModule,
    HotelsModule,
    HotelBookingsModule,
    PaymentsModule,
    ItinerariesModule,
    BlogModule,
    NotificationsModule,
    UploadsModule,
    ReferenceDataModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}