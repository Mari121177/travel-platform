import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListReservationsQueryDto } from './dto/queries.dto';
import { HotelBookingsService } from './hotel-bookings.service';
import { ParseObjectIdPipe } from './parse-object-id.pipe';

// TODO(auth): @UseGuards(JwtAuthGuard, RolesGuard) + @Roles('hotel_moderator') and verify
// that :id is the moderator's own assigned hotel (ACC-11).
@ApiTags('Hotel Bookings')
@Controller('hotels/:id/reservations')
export class HotelReservationsController {
  constructor(private readonly service: HotelBookingsService) {}

  @Get()
  @ApiOperation({ summary: 'HTL-22: moderator view of reservations for their hotel' })
  list(@Param('id', ParseObjectIdPipe) hotelId: string, @Query() query: ListReservationsQueryDto) {
    return this.service.listForHotel(hotelId, query);
  }
}
