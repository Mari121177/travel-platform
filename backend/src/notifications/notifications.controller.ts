import {
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationIdParamDto } from './dto/notification-id-param.dto';
import { NotificationsService } from './notifications.service';

// ---------------------------------------------------------------------------
// WHEN MARIAM'S AUTH IS MERGED:
// 1. Uncomment the imports below (check the exact paths with her).
// 2. Uncomment @UseGuards(...) on the class.
// 3. Delete @ApiHeader(...) on the class.
// 4. In each method, replace
//      @Headers('x-user-id') userId: string
//    with
//      @CurrentUser() user: { id: string }
//    and pass user.id instead of userId.
// ---------------------------------------------------------------------------
// import { UseGuards } from '@nestjs/common';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Notifications')
// @UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('unread-count')
  @ApiOperation({ summary: 'GEN-01: my unread notification count' })
  @ApiOkResponse({ description: 'Returns { unreadCount: <number> }' })
  getUnreadCount(@Headers('x-user-id') userId: string) {
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
  @ApiBadRequestResponse({ description: 'Invalid user id or query' })
  findMine(
    @Headers('x-user-id') userId: string,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.findForUser(userId, query);
  }

  // Declared before ':id/read' so the path is clear to readers.
  @Patch('read-all')
  @ApiOperation({ summary: 'GEN-01: mark all my notifications as read' })
  @ApiOkResponse({ description: 'Returns { updated: <number> }' })
  markAllAsRead(@Headers('x-user-id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'GEN-01: mark one of my notifications as read' })
  @ApiOkResponse({ description: 'Returns the updated notification' })
  @ApiNotFoundResponse({ description: 'Not found, or not your notification' })
  markAsRead(
    @Headers('x-user-id') userId: string,
    @Param() params: NotificationIdParamDto,
  ) {
    return this.notificationsService.markAsRead(userId, params.id);
  }
}
