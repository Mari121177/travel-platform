import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ItineraryHotelsQueryDto } from './dto/itinerary-hotels-query.dto';
import { ItineraryHotelsService } from './itinerary-hotels.service';

@ApiTags('Itineraries')
@ApiCookieAuth('access_token')
@Controller('itineraries')
export class ItineraryHotelsController {
  constructor(private readonly hotelsService: ItineraryHotelsService) {}

  @Get(':id/hotels')
  @Roles(Role.User)
  @ApiOperation({
    summary:
      'Hotels with free rooms for each city group of my itinerary, using the group dates (ITN-25)',
  })
  findHotels(
    @Param('id') id: string,
    @Query() query: ItineraryHotelsQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.hotelsService.findForCityGroups(id, user, query);
  }
}
