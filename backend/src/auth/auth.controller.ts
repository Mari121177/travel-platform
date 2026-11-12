import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AllowPasswordChange } from '../common/decorators/allow-password-change.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

import type {
  AuthUser,
  RequestWithUser,
} from '../common/interfaces/auth-user.interface';
import { REFRESH_COOKIE } from './auth.constants';
import { clearAuthCookies, setAuthCookies } from './auth.cookies';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user (ACC-01)' })
  @ApiCreatedResponse({ description: 'Account created' })
  @ApiBadRequestResponse({
    description: 'Invalid email, weak password, or consent not given',
  })
  @ApiConflictResponse({ description: 'Email is already registered' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Log in with email and password. Tokens are set as httpOnly cookies (ACC-04, ACC-05, ACC-19)',
  })
  @ApiOkResponse({ description: 'Logged in. Returns the user, tokens are in cookies' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @ApiForbiddenResponse({ description: 'Account suspended or deactivated' })
  @ApiResponse({
    status: 423,
    description: 'Account locked for 15 minutes after 5 failed attempts',
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.authService.login(dto);
    setAuthCookies(res, accessToken, refreshToken);
    return user;
  }

  // Public on purpose: it is called when the access token has expired. The
  // refresh token cookie (sent only to /api/auth) is what proves the session.
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Get a new access token using the refresh token cookie. The refresh token is replaced too (ACC-06, ACC-19)',
  })
  @ApiOkResponse({ description: 'New cookies set. Returns the user' })
  @ApiUnauthorizedResponse({
    description: 'No refresh token, invalid or already used, logged out, or inactive for 30 minutes',
  })
  @ApiForbiddenResponse({ description: 'Account suspended or deactivated' })
  async refresh(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.authService.refresh(
      req.cookies?.[REFRESH_COOKIE],
    );
    setAuthCookies(res, accessToken, refreshToken);
    return user;
  }

  @Get('me')
  @AllowPasswordChange()
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Current logged-in user. The frontend calls this to know who is logged in (ACC-19)',
  })
  @ApiOkResponse({ description: 'The logged-in user' })
  @ApiUnauthorizedResponse({ description: 'Not logged in, or the session expired' })
  @ApiForbiddenResponse({ description: 'Account suspended or deactivated' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  // AllowPasswordChange: an account with a temporary password must be able to
  // call this route, it is how the temporary password gets replaced (ACC-07a)
  @Patch('change-password')
  @AllowPasswordChange()
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Change my password with the current password and a new one (ACC-08). Also ends a temporary password (ACC-07a)',
  })
  @ApiOkResponse({ description: 'Password changed. New cookies are set. Returns the user' })
  @ApiBadRequestResponse({
    description: 'Current password wrong, new password breaks the rules or equals the current one',
  })
  @ApiUnauthorizedResponse({ description: 'Not logged in, or the session expired' })
  @ApiForbiddenResponse({ description: 'Account suspended or deactivated' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.changePassword(userId, dto);
    setAuthCookies(res, accessToken, refreshToken);
    return user;
  }

  // Public on purpose: it must work even when the access token has expired
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Log out: clears the cookies and revokes the refresh token on the server (ACC-06)',
  })
  @ApiOkResponse({ description: 'Logged out' })
  async logout(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.user?.id, req.cookies?.[REFRESH_COOKIE]);
    clearAuthCookies(res);
    return { message: 'Logged out' };
  }
}