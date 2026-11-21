import { Controller, ForbiddenException, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ListReservationsQueryDto } from './dto/queries.dto';
import { HotelBookingsService } from './hotel-bookings.service';
import { ParseObjectIdPipe } from './parse-object-id.pipe';

@ApiTags('Hotel Bookings')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'Not logged in, or the session expired' })
@Controller('hotels/:id/reservations')
export class HotelReservationsController {
  constructor(private readonly service: HotelBookingsService) {}

  @Get()
  @Roles(Role.HotelModerator)
  @ApiOperation({ summary: 'HTL-22: moderator view of reservations for their own hotel' })
  @ApiOkResponse({ description: 'Returns { data, total, page, limit }; each item has the guest name and email' })
  @ApiBadRequestResponse({ description: 'Malformed id or invalid query' })
  @ApiForbiddenResponse({ description: 'Hotel moderators only, and only for their own hotel' })
  list(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) hotelId: string,
    @Query() query: ListReservationsQueryDto,
  ) {
    // ownership check (ACC-11 / GEN-13): a moderator may only see their assigned hotel
    if (String(user.assignedProviderId ?? '').toLowerCase() !== hotelId.toLowerCase()) {
      throw new ForbiddenException('You can only view reservations of your own hotel');
    }
    return this.service.listForHotel(hotelId, query);
  }
}
