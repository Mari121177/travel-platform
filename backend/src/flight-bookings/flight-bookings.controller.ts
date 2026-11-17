import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ListFlightBookingsQueryDto } from './dto/list-flight-bookings.dto';
import { FlightBookingsService } from './flight-bookings.service';

@ApiTags('Flight bookings')
@ApiCookieAuth()
@Roles(Role.User)
@Controller('flight-bookings')
export class FlightBookingsController {
  constructor(private readonly service: FlightBookingsService) {}

  @Get()
  @ApiOperation({
    summary:
      'My flight bookings, grouped as upcoming, past or cancelled (FLT-25)',
  })
  listMine(
    @CurrentUser('id') userId: string,
    @Query() query: ListFlightBookingsQueryDto,
  ) {
    return this.service.listMine(userId, query.group, query.page ?? 1);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Full details of one of my bookings (FLT-25)' })
  getMine(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.getMine(userId, id);
  }
}