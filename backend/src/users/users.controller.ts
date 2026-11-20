import { Body, Controller, Delete, Get, HttpCode, Patch, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { Response } from 'express';
import { clearAuthCookies } from '../auth/auth.cookies';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

// Every route here needs a login (global guard). The user can only reach their
// own profile: the id comes from the session, never from the request.
@ApiTags('Users')
@ApiCookieAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'My profile (ACC-09)' })
  @ApiOkResponse({ description: 'The profile of the logged-in user' })
  @ApiUnauthorizedResponse({ description: 'Not logged in, or the session expired' })
  @ApiForbiddenResponse({
    description: 'Account suspended or deactivated, or a temporary password must be changed first',
  })
  getMe(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  @ApiOperation({
    summary:
      'Edit my name, phone number and preferred currency. Saved only if every field sent is valid (ACC-09)',
  })
  @ApiOkResponse({ description: 'The updated profile' })
  @ApiBadRequestResponse({
    description: 'A field is invalid, the currency is not supported, nothing was sent, or an unknown field was sent',
  })
  @ApiUnauthorizedResponse({ description: 'Not logged in, or the session expired' })
  @ApiForbiddenResponse({
    description: 'Account suspended or deactivated, or a temporary password must be changed first',
  })
  updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Delete('me')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Deactivate my account after confirmation. Blocked while I have upcoming Confirmed bookings (ACC-12)',
  })
  @ApiOkResponse({ description: 'Account deactivated; cookies cleared' })
  @ApiConflictResponse({
    description: 'An upcoming Confirmed hotel or flight booking exists',
  })
  @ApiUnauthorizedResponse({ description: 'Not logged in, or the session expired' })
  async deactivateMe(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.usersService.deactivateAccount(userId);
    clearAuthCookies(res);
    return result;
  }
}