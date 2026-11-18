import { Body, Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ContentParamsDto } from './dto/content-params.dto';
import { ListReportsQueryDto } from './dto/list-reports-query.dto';
import { ReportIdParamDto } from './dto/report-id-param.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { ReportsService } from './reports.service';

// GEN-10: admin reports and direct content moderation.
@ApiTags('Admin')
@ApiCookieAuth()
@Roles(Role.Admin)
@ApiUnauthorizedResponse({ description: 'Not logged in, or the session expired' })
@ApiForbiddenResponse({ description: 'Admins only' })
@Controller('admin')
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('reports')
  @ApiOperation({
    summary: 'GEN-10: list reports, open by default, 10 per page',
  })
  @ApiOkResponse({
    description: 'Returns { items, page, limit, total, totalPages }',
  })
  @ApiBadRequestResponse({ description: 'Invalid query' })
  list(@Query() query: ListReportsQueryDto) {
    return this.reportsService.list(query);
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'GEN-10: one report' })
  @ApiOkResponse({ description: 'The report' })
  @ApiNotFoundResponse({ description: 'Report not found' })
  findOne(@Param() params: ReportIdParamDto) {
    return this.reportsService.findOne(params.id);
  }

  @Patch('reports/:id')
  @ApiOperation({
    summary: 'GEN-10: dismiss, hide the content, or delete the content',
  })
  @ApiOkResponse({ description: 'The resolved report' })
  @ApiNotFoundResponse({ description: 'Report or content not found' })
  resolve(
    @CurrentUser() admin: AuthUser,
    @Param() params: ReportIdParamDto,
    @Body() dto: ResolveReportDto,
  ) {
    return this.reportsService.resolve(admin, params.id, dto);
  }

  @Patch('content/:type/:id')
  @ApiOperation({ summary: 'GEN-10: hide a post, comment, review or itinerary' })
  @ApiOkResponse({ description: 'The content is hidden' })
  @ApiNotFoundResponse({ description: 'Content not found' })
  hide(@CurrentUser() admin: AuthUser, @Param() params: ContentParamsDto) {
    return this.reportsService.hideContentDirect(admin, params.type, params.id);
  }

  @Delete('content/:type/:id')
  @ApiOperation({ summary: 'GEN-10: delete a post, comment, review or itinerary' })
  @ApiOkResponse({ description: 'The content is deleted' })
  @ApiNotFoundResponse({ description: 'Content not found' })
  remove(@CurrentUser() admin: AuthUser, @Param() params: ContentParamsDto) {
    return this.reportsService.deleteContentDirect(admin, params.type, params.id);
  }
}
