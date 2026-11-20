import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@ApiTags('Admin')
@ApiCookieAuth()
@Roles(Role.Admin)
@ApiUnauthorizedResponse({ description: 'Not logged in, or the session expired' })
@ApiForbiddenResponse({ description: 'Admins only' })
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly service: AdminAnalyticsService) {}

  @Get()
  @ApiOperation({
    summary:
      'BON-01: confirmed bookings and revenue per hotel/airline for a period (default last 30 days)',
  })
  @ApiOkResponse({
    description: 'Returns { from, to, providers, totals }',
  })
  @ApiBadRequestResponse({ description: 'Invalid date range' })
  overview(@Query() query: AnalyticsQueryDto) {
    return this.service.overview(query);
  }
}
