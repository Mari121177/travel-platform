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
import { AddDayDto } from './dto/add-day.dto';
import { DayParamsDto } from './dto/day-params.dto';
import { ItineraryIdParamDto } from './dto/itinerary-id-param.dto';
import { ReorderDayDto } from './dto/reorder-day.dto';
import { UpdateDayDto } from './dto/update-day.dto';
import { ItineraryDaysService } from './itinerary-days.service';

// ITN-05, ITN-07, ITN-08, ITN-09. Owner only. A day of someone else's private
// itinerary gives 404, a day of their public one gives 403 (same as ITN-01).
@ApiTags('Itineraries')
@ApiCookieAuth('access_token')
@Controller('itineraries')
export class ItineraryDaysController {
  constructor(private readonly daysService: ItineraryDaysService) {}

  @Post(':id/days')
  @Roles(Role.User)
  @ApiOperation({
    summary: 'ITN-05: add a day at the end (needs a city, at most 60 days)',
  })
  @ApiCreatedResponse({
    description:
      'The itinerary with numbered, dated days and its city groups (ITN-09)',
  })
  @ApiBadRequestResponse({
    description: 'Unknown city, notes too long, or already 60 days',
  })
  @ApiNotFoundResponse({ description: 'Itinerary not found' })
  addDay(
    @Param() params: ItineraryIdParamDto,
    @CurrentUser() user: AuthUser,
    @Body() dto: AddDayDto,
  ) {
    return this.daysService.addDay(params.id, user, dto);
  }

  // Declared before ":dayId" so "reorder" is never read as a day id
  @Patch(':id/days/reorder')
  @Roles(Role.User)
  @ApiOperation({
    summary: 'ITN-08: move a day to a new position (1 = first day)',
  })
  @ApiOkResponse({
    description: 'The itinerary with renumbered, re-dated days and city groups',
  })
  @ApiBadRequestResponse({ description: 'Position out of range' })
  @ApiNotFoundResponse({ description: 'Itinerary or day not found' })
  reorderDay(
    @Param() params: ItineraryIdParamDto,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReorderDayDto,
  ) {
    return this.daysService.reorderDay(params.id, user, dto);
  }

  @Patch(':id/days/:dayId')
  @Roles(Role.User)
  @ApiOperation({ summary: "ITN-05: edit a day's city and notes" })
  @ApiOkResponse({ description: 'The itinerary with its days and city groups' })
  @ApiBadRequestResponse({
    description: 'Nothing sent, null value, unknown city, or notes too long',
  })
  @ApiNotFoundResponse({ description: 'Itinerary or day not found' })
  updateDay(
    @Param() params: DayParamsDto,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateDayDto,
  ) {
    return this.daysService.updateDay(params.id, params.dayId, user, dto);
  }

  @Delete(':id/days/:dayId')
  @Roles(Role.User)
  @ApiOperation({
    summary: 'ITN-07: delete a day; the later days are renumbered and re-dated',
  })
  @ApiOkResponse({
    description: 'The itinerary with renumbered days and city groups',
  })
  @ApiNotFoundResponse({ description: 'Itinerary or day not found' })
  removeDay(@Param() params: DayParamsDto, @CurrentUser() user: AuthUser) {
    return this.daysService.removeDay(params.id, params.dayId, user);
  }
}
