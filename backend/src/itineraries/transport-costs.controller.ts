import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreateTransportCostDto } from './dto/create-transport-cost.dto';
import { ItineraryIdParamDto } from './dto/itinerary-id-param.dto';
import { ObjectIdParamDto } from './dto/object-id-param.dto';
import { UpdateTransportCostDto } from './dto/update-transport-cost.dto';
import { TransportCostsService } from './transport-costs.service';

// ITN-16. Owner only. Someone else's private itinerary gives 404, their public
// one gives 403 (same as ITN-01).
@ApiTags('Transport costs')
@ApiCookieAuth('access_token')
@Controller()
export class TransportCostsController {
  constructor(private readonly transportCostsService: TransportCostsService) {}

  @Post('itineraries/:id/transport-costs')
  @Roles(Role.User)
  @ApiOperation({
    summary:
      'ITN-16: add an intercity transport cost (mode, from-city, to-city, amount, currency, day)',
  })
  @ApiCreatedResponse({ description: 'The new transport cost' })
  @ApiBadRequestResponse({
    description: 'Unknown mode, city or currency, or a negative amount',
  })
  @ApiNotFoundResponse({ description: 'Itinerary or day not found' })
  create(
    @Param() params: ItineraryIdParamDto,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTransportCostDto,
  ) {
    return this.transportCostsService.create(params.id, user, dto);
  }

  @Patch('transport-costs/:id')
  @Roles(Role.User)
  @ApiOperation({ summary: 'ITN-16: edit a transport cost' })
  @ApiOkResponse({ description: 'The updated transport cost' })
  @ApiBadRequestResponse({ description: 'Nothing sent, or an invalid value' })
  @ApiNotFoundResponse({ description: 'Transport cost not found' })
  update(
    @Param() params: ObjectIdParamDto,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTransportCostDto,
  ) {
    return this.transportCostsService.update(params.id, user, dto);
  }

  @Delete('transport-costs/:id')
  @Roles(Role.User)
  @ApiOperation({ summary: 'ITN-16: delete a transport cost' })
  @ApiOkResponse({ description: 'Transport cost deleted' })
  @ApiNotFoundResponse({ description: 'Transport cost not found' })
  remove(@Param() params: ObjectIdParamDto, @CurrentUser() user: AuthUser) {
    return this.transportCostsService.remove(params.id, user);
  }
}
