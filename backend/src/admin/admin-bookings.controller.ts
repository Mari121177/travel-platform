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
import { AdminBookingsService } from './admin-bookings.service';
import { ListAdminBookingsQueryDto } from './dto/list-bookings-query.dto';

@ApiTags('Admin')
@ApiCookieAuth()
@Roles(Role.Admin)
@ApiUnauthorizedResponse({ description: 'Not logged in, or the session expired' })
@ApiForbiddenResponse({ description: 'Admins only' })
@Controller('admin/bookings')
export class AdminBookingsController {
  constructor(private readonly bookingsService: AdminBookingsService) {}

  @Get()
  @ApiOperation({
    summary:
      'ACC-17: all flight and hotel bookings, filterable by type, status and createdAt range, 10 per page',
  })
  @ApiOkResponse({
    description:
      'Returns { data, total, page, limit, totalPages }. Items have type hotel or flight.',
  })
  @ApiBadRequestResponse({ description: 'Invalid query' })
  list(@Query() query: ListAdminBookingsQueryDto) {
    return this.bookingsService.list(query);
  }
}
