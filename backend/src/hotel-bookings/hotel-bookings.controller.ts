import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateHotelBookingDto } from './dto/create-hotel-booking.dto';
import { ListBookingsQueryDto } from './dto/queries.dto';
import { HotelBookingsService } from './hotel-bookings.service';
import { ParseObjectIdPipe } from './parse-object-id.pipe';
import { TempUserId } from './temp-user.decorator';

// TODO(auth): add @UseGuards(JwtAuthGuard, RolesGuard) + @Roles('user') on the class,
// and swap @TempUserId() for @CurrentUser() once Mariam's auth is merged.
@ApiTags('Hotel Bookings')
@ApiHeader({ name: 'x-user-id', required: true, description: 'TEMPORARY until auth is merged' })
@Controller('hotel-bookings')
export class HotelBookingsController {
  constructor(private readonly service: HotelBookingsService) {}

  @Post()
  @ApiOperation({
    summary: 'HTL-16/HTL-18: reserve one or more rooms (Pending Payment, held 10 min)',
  })
  create(@TempUserId() userId: string, @Body() dto: CreateHotelBookingDto) {
    return this.service.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'HTL-20: my reservations (grouped upcoming / past / cancelled)' })
  list(@TempUserId() userId: string, @Query() query: ListBookingsQueryDto) {
    return this.service.list(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'HTL-20: reservation details (own only)' })
  getOne(@TempUserId() userId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.getOne(userId, id);
  }

  @Get(':id/cancellation-quote')
  @ApiOperation({ summary: 'HTL-21: refund the user would get if they cancel now' })
  quote(@TempUserId() userId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.cancellationQuote(userId, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'HTL-21: cancel a Confirmed reservation as a whole' })
  cancel(@TempUserId() userId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.cancel(userId, id);
  }
}
