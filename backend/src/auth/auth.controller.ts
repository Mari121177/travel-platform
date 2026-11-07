import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { setAuthCookies } from './auth.cookies';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}