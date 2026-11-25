import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateHotelBookingDto } from './dto/create-hotel-booking.dto';
import { ListBookingsQueryDto } from './dto/queries.dto';
import { HotelBookingsService } from './hotel-bookings.service';
import { ParseObjectIdPipe } from './parse-object-id.pipe';

// Login is required globally; @Roles(Role.User) limits these routes to registered users (ACC-11).
@ApiTags('Hotel Bookings')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'Not logged in, or the session expired' })
@ApiForbiddenResponse({ description: 'Registered users only' })
@Controller('hotel-bookings')
export class HotelBookingsController {
  constructor(private readonly service: HotelBookingsService) {}

  @Post()
  @Roles(Role.User)
  @ApiOperation({
    summary: 'HTL-16/HTL-18: reserve one or more rooms (Pending Payment, held 10 min)',
  })
  @ApiCreatedResponse({ description: 'Reservation created in Pending Payment; the rooms are held for 10 minutes' })
  @ApiBadRequestResponse({ description: 'Invalid dates, guests or body' })
  @ApiNotFoundResponse({ description: 'Hotel or room not found' })
  @ApiConflictResponse({ description: 'A room is not available for the whole stay; nothing is held' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateHotelBookingDto) {
    return this.service.create(userId, dto);
  }

  @Get()
  @Roles(Role.User)
  @ApiOperation({ summary: 'HTL-20: my reservations (grouped upcoming / past / cancelled)' })
  @ApiOkResponse({ description: 'Returns { data, total, page, limit }, 10 per page' })
  @ApiBadRequestResponse({ description: 'Invalid query' })
  list(@CurrentUser('id') userId: string, @Query() query: ListBookingsQueryDto) {
    return this.service.list(userId, query);
  }

  @Get(':id')
  @Roles(Role.User)
  @ApiOperation({ summary: 'HTL-20: reservation details (own only)' })
  @ApiOkResponse({ description: 'The reservation' })
  @ApiBadRequestResponse({ description: 'Malformed id' })
  @ApiNotFoundResponse({ description: 'Not found, or it belongs to another user' })
  getOne(@CurrentUser('id') userId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.getOne(userId, id);
  }

  @Get(':id/cancellation-quote')
  @Roles(Role.User)
  @ApiOperation({ summary: 'HTL-21: refund the user would get if they cancel now' })
  @ApiOkResponse({ description: 'Refund percent and amount from the hotel cancellation tiers' })
  @ApiBadRequestResponse({ description: 'Malformed id' })
  @ApiNotFoundResponse({ description: 'Not found, or it belongs to another user' })
  @ApiConflictResponse({ description: 'Not Confirmed, or the stay has already started' })
  quote(@CurrentUser('id') userId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.cancellationQuote(userId, id);
  }

  @Post(':id/cancel')
  @Roles(Role.User)
  @ApiOperation({ summary: 'HTL-21: cancel a Confirmed reservation as a whole' })
  @ApiCreatedResponse({ description: 'Cancelled; rooms released; refund created when the amount is above 0' })
  @ApiBadRequestResponse({ description: 'Malformed id' })
  @ApiNotFoundResponse({ description: 'Not found, or it belongs to another user' })
  @ApiConflictResponse({ description: 'Not Confirmed, or the stay has already started' })
  cancel(@CurrentUser('id') userId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.cancel(userId, id);
  }
}
