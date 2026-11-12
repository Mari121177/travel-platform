import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
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
import { AdminAccountsService } from './admin-accounts.service';
import { AccountIdParamDto } from './dto/account-id-param.dto';
import { ListAccountsQueryDto } from './dto/list-accounts-query.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SuspendAccountDto } from './dto/suspend-account.dto';

// Every route in this controller is for admins only. The check is made on the
// server (GEN-13), whatever the frontend does.
@ApiTags('Admin')
@ApiCookieAuth()
@Roles(Role.Admin)
@Controller('admin')
export class AdminAccountsController {
  constructor(private readonly accountsService: AdminAccountsService) {}

  @Get('accounts')
  @ApiOperation({
    summary:
      'List all accounts, newest first, 10 per page. Search by name or email, filter by role and status (ACC-14)',
  })
  @ApiOkResponse({ description: 'Returns { items, page, limit, total, totalPages }' })
  @ApiBadRequestResponse({ description: 'Invalid query' })
  @ApiUnauthorizedResponse({ description: 'Not logged in, or the session expired' })
  @ApiForbiddenResponse({ description: 'Admins only' })
  list(@Query() query: ListAccountsQueryDto) {
    return this.accountsService.list(query);
  }

  @Patch('accounts/:id/suspend')
  @ApiOperation({
    summary:
      'Suspend a user or moderator. A suspended account cannot log in (ACC-16, ACC-15)',
  })
  @ApiOkResponse({ description: 'The suspended account' })
  @ApiBadRequestResponse({ description: 'Invalid id or reason' })
  @ApiForbiddenResponse({ description: 'Not an admin, or the target is an admin account' })
  @ApiNotFoundResponse({ description: 'Account not found' })
  @ApiConflictResponse({ description: 'Already suspended, or deactivated by its owner' })
  suspend(
    @CurrentUser() admin: AuthUser,
    @Param() params: AccountIdParamDto,
    @Body() dto: SuspendAccountDto,
  ) {
    return this.accountsService.suspend(admin, params.id, dto.reason);
  }

  @Patch('accounts/:id/reactivate')
  @ApiOperation({ summary: 'Reactivate a suspended account (ACC-16, ACC-15)' })
  @ApiOkResponse({ description: 'The reactivated account' })
  @ApiBadRequestResponse({ description: 'Invalid id' })
  @ApiForbiddenResponse({ description: 'Not an admin, or the target is an admin account' })
  @ApiNotFoundResponse({ description: 'Account not found' })
  @ApiConflictResponse({ description: 'Not suspended, or deactivated by its owner' })
  reactivate(
    @CurrentUser() admin: AuthUser,
    @Param() params: AccountIdParamDto,
  ) {
    return this.accountsService.reactivate(admin, params.id);
  }

  @Post('users/:id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Set a temporary password for a user or moderator. They must choose a new one at the next login (ACC-07a)',
  })
  @ApiOkResponse({ description: 'The account, with mustChangePassword true' })
  @ApiBadRequestResponse({ description: 'Invalid id, or the password breaks the password rules' })
  @ApiForbiddenResponse({ description: 'Not an admin, or the target is an admin account' })
  @ApiNotFoundResponse({ description: 'Account not found' })
  @ApiConflictResponse({ description: 'The account was deactivated by its owner' })
  resetPassword(
    @CurrentUser() admin: AuthUser,
    @Param() params: AccountIdParamDto,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.accountsService.resetPassword(admin, params.id, dto);
  }
}
