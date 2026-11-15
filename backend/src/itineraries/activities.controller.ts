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
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { DayParamsDto } from './dto/day-params.dto';
import { ObjectIdParamDto } from './dto/object-id-param.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

// ITN-10. Owner only. An activity of someone else's private itinerary gives
// 404, one of their public itinerary gives 403 (same as ITN-01).
@ApiTags('Activities')
@ApiCookieAuth('access_token')
@Controller()
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post('itineraries/:id/days/:dayId/activities')
  @Roles(Role.User)
  @ApiOperation({
    summary:
      'ITN-10: add an activity to a day (name, description, optional time and cost)',
  })
  @ApiCreatedResponse({ description: 'The new activity' })
  @ApiBadRequestResponse({
    description:
      'Missing name or description, bad time, a cost without a currency (or the other way round), or an unsupported currency',
  })
  @ApiNotFoundResponse({ description: 'Itinerary or day not found' })
  create(
    @Param() params: DayParamsDto,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateActivityDto,
  ) {
    return this.activitiesService.create(params.id, params.dayId, user, dto);
  }

  @Patch('activities/:id')
  @Roles(Role.User)
  @ApiOperation({
    summary:
      'ITN-10: edit an activity (send null for time or cost to clear it)',
  })
  @ApiOkResponse({ description: 'The updated activity' })
  @ApiBadRequestResponse({ description: 'Nothing sent, or an invalid value' })
  @ApiNotFoundResponse({ description: 'Activity not found' })
  update(
    @Param() params: ObjectIdParamDto,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateActivityDto,
  ) {
    return this.activitiesService.update(params.id, user, dto);
  }

  @Delete('activities/:id')
  @Roles(Role.User)
  @ApiOperation({ summary: 'ITN-10: delete an activity' })
  @ApiOkResponse({ description: 'Activity deleted' })
  @ApiNotFoundResponse({ description: 'Activity not found' })
  remove(@Param() params: ObjectIdParamDto, @CurrentUser() user: AuthUser) {
    return this.activitiesService.remove(params.id, user);
  }
}
