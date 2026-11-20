import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ItineraryFlightsQueryDto } from './dto/itinerary-flights-query.dto';
import { ItineraryFlightsService } from './itinerary-flights.service';

@ApiTags('Itineraries')
@ApiCookieAuth('access_token')
@Roles(Role.User)
@Controller('itineraries')
export class ItineraryFlightsController {
  constructor(private readonly service: ItineraryFlightsService) {}

  @Get(':id/flights')
  @ApiOperation({
    summary:
      'ITN-26: search one-way or round-trip flights from a chosen origin to the first itinerary city',
  })
  findFlights(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Query() query: ItineraryFlightsQueryDto,
  ) {
    return this.service.findForItinerary(id, user, query);
  }
}
