import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AirlinesService } from '../airlines/airlines.service';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { FlightBookingsService } from '../flight-bookings/flight-bookings.service';
import { HotelBookingsService } from '../hotel-bookings/hotel-bookings.service';
import { HotelsService } from '../hotels/hotels.service';
import { NotificationType } from '../notifications/notification-type.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { ModeratorType } from './dto/create-moderator.dto';
import { AuditAction } from './audit-action';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class AdminProvidersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly hotelsService: HotelsService,
    private readonly airlinesService: AirlinesService,
    private readonly hotelBookingsService: HotelBookingsService,
    private readonly flightBookingsService: FlightBookingsService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ACC-15: deactivate or reactivate a hotel or airline. Existing Confirmed
  // bookings stay valid; the provider is hidden from search and cannot be booked.
  async setActive(
    admin: AuthUser,
    type: ModeratorType,
    providerId: string,
    isActive: boolean,
  ) {
    const current =
      type === ModeratorType.Hotel
        ? await this.hotelsService.findHotelForAdmin(providerId)
        : await this.airlinesService.findAirlineForAdmin(providerId);
    if (current.isActive === isActive) {
      throw new ConflictException(
        `Provider is already ${isActive ? 'active' : 'deactivated'}`,
      );
    }

    const provider =
      type === ModeratorType.Hotel
        ? await this.hotelsService.setHotelActive(providerId, isActive)
        : await this.airlinesService.setActive(providerId, isActive);

    const providerName =
      (provider as { name?: string }).name ?? 'Provider';

    const role =
      type === ModeratorType.Hotel
        ? Role.HotelModerator
        : Role.AirlineModerator;

    const moderators = await this.userModel
      .find({
        role,
        assignedProviderId: new Types.ObjectId(providerId),
      })
      .select('_id')
      .lean()
      .exec();

    const recipients = new Set(moderators.map((u) => String(u._id)));

    // Users with Confirmed bookings remain valid, but they should know.
    if (!isActive) {
      const guests =
        type === ModeratorType.Hotel
          ? await this.hotelBookingsService.getUserIdsWithConfirmedBookings(
              providerId,
            )
          : await this.flightBookingsService.getUserIdsWithConfirmedBookingsForAirline(
              providerId,
            );
      for (const guestId of guests) recipients.add(guestId);
    }

    const notificationType = isActive
      ? NotificationType.PROVIDER_REACTIVATED
      : NotificationType.PROVIDER_DEACTIVATED;

    const message = isActive
      ? `The ${type} "${providerName}" has been reactivated.`
      : `The ${type} "${providerName}" has been deactivated by an administrator. Existing Confirmed bookings remain valid.`;

    await this.notificationsService.sendMany(
      [...recipients],
      notificationType,
      message,
      {
        providerType: type,
        providerId,
        providerName,
      },
    );

    await this.auditLogService.record({
      admin,
      action: isActive
        ? AuditAction.ReactivateProvider
        : AuditAction.DeactivateProvider,
      targetType: 'provider',
      targetId: providerId,
      targetLabel: providerName,
      details: {
        providerType: type,
        notifiedUsers: recipients.size,
      },
    });

    return {
      providerId,
      providerType: type,
      providerName,
      isActive,
      notifiedUsers: recipients.size,
    };
  }
}
