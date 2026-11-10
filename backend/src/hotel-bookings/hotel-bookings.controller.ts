import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateHotelBookingDto } from './dto/create-hotel-booking.dto';
import { ListBookingsQueryDto } from './dto/queries.dto';
import { HotelBookingsService } from './hotel-bookings.service';
import { ParseObjectIdPipe } from './parse-object-id.pipe';

// Login is required globally; @Roles(Role.User) limits these routes to registered users (ACC-11).
@ApiTags('Hotel Bookings')
@Controller('hotel-bookings')
export class HotelBookingsController {
  constructor(private readonly service: HotelBookingsService) {}

  @Post()
  @Roles(Role.User)
  @ApiOperation({
    summary: 'HTL-16/HTL-18: reserve one or more rooms (Pending Payment, held 10 min)',
  })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateHotelBookingDto) {
    return this.service.create(userId, dto);
  }

  @Get()
  @Roles(Role.User)
  @ApiOperation({ summary: 'HTL-20: my reservations (grouped upcoming / past / cancelled)' })
  list(@CurrentUser('id') userId: string, @Query() query: ListBookingsQueryDto) {
    return this.service.list(userId, query);
  }

  @Get(':id')
  @Roles(Role.User)
  @ApiOperation({ summary: 'HTL-20: reservation details (own only)' })
  getOne(@CurrentUser('id') userId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.getOne(userId, id);
  }

  @Get(':id/cancellation-quote')
  @Roles(Role.User)
  @ApiOperation({ summary: 'HTL-21: refund the user would get if they cancel now' })
  quote(@CurrentUser('id') userId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.cancellationQuote(userId, id);
  }

  @Post(':id/cancel')
  @Roles(Role.User)
  @ApiOperation({ summary: 'HTL-21: cancel a Confirmed reservation as a whole' })
  cancel(@CurrentUser('id') userId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.cancel(userId, id);
  }
}