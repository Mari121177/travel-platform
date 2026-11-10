import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationIdParamDto } from './dto/notification-id-param.dto';
import { NotificationsService } from './notifications.service';

// GEN-01. Login is required (global JwtAuthGuard). Every route uses the
// logged-in user's id, so users only see and update their own notifications.
@ApiTags('Notifications')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'Not logged in, or the session expired' })
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('unread-count')
  @ApiOperation({ summary: 'GEN-01: my unread notification count' })
  @ApiOkResponse({ description: 'Returns { unreadCount: <number> }' })
  getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Get()
  @ApiOperation({
    summary: 'GEN-01: list my notifications (newest first, 10 per page)',
  })
  @ApiOkResponse({
    description:
      'Returns { items, page, limit, total, totalPages, unreadCount }',
  })
  @ApiBadRequestResponse({ description: 'Invalid query' })
  findMine(
    @CurrentUser('id') userId: string,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.findForUser(userId, query);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'GEN-01: mark all my notifications as read' })
  @ApiOkResponse({ description: 'Returns { updated: <number> }' })
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'GEN-01: mark one of my notifications as read' })
  @ApiOkResponse({ description: 'Returns the updated notification' })
  @ApiNotFoundResponse({ description: 'Not found, or not your notification' })
  markAsRead(
    @CurrentUser('id') userId: string,
    @Param() params: NotificationIdParamDto,
  ) {
    return this.notificationsService.markAsRead(userId, params.id);
  }
}
