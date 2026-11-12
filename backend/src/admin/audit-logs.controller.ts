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
import { AuditLogService } from './audit-log.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

@ApiTags('Admin')
@ApiCookieAuth()
@Roles(Role.Admin)
@Controller('admin/audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({
    summary: 'Audit log of admin actions, newest first, 10 per page (GEN-07)',
  })
  @ApiOkResponse({ description: 'Returns { items, page, limit, total, totalPages }' })
  @ApiBadRequestResponse({ description: 'Invalid query' })
  @ApiUnauthorizedResponse({ description: 'Not logged in, or the session expired' })
  @ApiForbiddenResponse({ description: 'Admins only' })
  list(@Query() query: ListAuditLogsQueryDto) {
    return this.auditLogService.list(query);
  }
}
