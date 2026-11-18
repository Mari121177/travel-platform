import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

// GEN-09: registered users report one item, once per item.
@ApiTags('Reports')
@ApiCookieAuth()
@Roles(Role.User)
@ApiUnauthorizedResponse({ description: 'Not logged in, or the session expired' })
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({
    summary: 'GEN-09: report a post, comment, review or itinerary with a reason',
  })
  @ApiCreatedResponse({ description: 'The report was created' })
  @ApiConflictResponse({ description: 'You have already reported this item' })
  @ApiNotFoundResponse({ description: 'The reported item does not exist' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateReportDto) {
    return this.reportsService.create(userId, dto);
  }
}
