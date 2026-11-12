import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
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
}