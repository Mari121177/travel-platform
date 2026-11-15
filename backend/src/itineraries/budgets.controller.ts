import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
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
import { BudgetsService } from './budgets.service';
import { CreateBudgetEntryDto } from './dto/create-budget-entry.dto';
import { DayParamsDto } from './dto/day-params.dto';
import { ItineraryIdParamDto } from './dto/itinerary-id-param.dto';
import { ObjectIdParamDto } from './dto/object-id-param.dto';
import { UpdateBudgetEntryDto } from './dto/update-budget-entry.dto';

// ITN-14. Adding, editing and deleting is owner only. Someone else's private
// itinerary gives 404, their public one gives 403 (same as ITN-01).
@ApiTags('Budgets')
@ApiCookieAuth('access_token')
@Controller()
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post('itineraries/:id/days/:dayId/budgets')
  @Roles(Role.User)
  @ApiOperation({
    summary:
      'ITN-14: add a budget entry to a day (food, accommodation, local_transport or activities)',
  })
  @ApiCreatedResponse({ description: 'The new budget entry' })
  @ApiBadRequestResponse({
    description: 'Negative amount, unknown category, or unsupported currency',
  })
  @ApiNotFoundResponse({ description: 'Itinerary or day not found' })
  create(
    @Param() params: DayParamsDto,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBudgetEntryDto,
  ) {
    return this.budgetsService.create(params.id, params.dayId, user, dto);
  }

  @Patch('budgets/:id')
  @Roles(Role.User)
  @ApiOperation({ summary: 'ITN-14: edit a budget entry' })
  @ApiOkResponse({ description: 'The updated budget entry' })
  @ApiBadRequestResponse({ description: 'Nothing sent, or an invalid value' })
  @ApiNotFoundResponse({ description: 'Budget entry not found' })
  update(
    @Param() params: ObjectIdParamDto,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateBudgetEntryDto,
  ) {
    return this.budgetsService.update(params.id, user, dto);
  }

  @Delete('budgets/:id')
  @Roles(Role.User)
  @ApiOperation({ summary: 'ITN-14: delete a budget entry' })
  @ApiOkResponse({ description: 'Budget entry deleted' })
  @ApiNotFoundResponse({ description: 'Budget entry not found' })
  remove(@Param() params: ObjectIdParamDto, @CurrentUser() user: AuthUser) {
    return this.budgetsService.remove(params.id, user);
  }

  @Get('itineraries/:id/budget-summary')
  @Roles(Role.User)
  @ApiOperation({
    summary:
      'ITN-14: total budget by category and by day (one total per currency until ITN-18 converts them)',
  })
  @ApiOkResponse({ description: 'Totals per currency, in total and per day' })
  @ApiNotFoundResponse({ description: 'Itinerary not found' })
  summary(@Param() params: ItineraryIdParamDto, @CurrentUser() user: AuthUser) {
    return this.budgetsService.getSummary(params.id, user);
  }
}
