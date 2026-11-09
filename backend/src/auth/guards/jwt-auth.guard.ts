import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ALLOW_PASSWORD_CHANGE_KEY } from '../../common/decorators/allow-password-change.decorator';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { AccountStatus } from '../../common/enums/account-status.enum';
import type {
  AuthUser,
  RequestWithUser,
} from '../../common/interfaces/auth-user.interface';
import { UsersService } from '../../users/users.service';
import { ACCESS_COOKIE, INACTIVITY_LIMIT_MINUTES } from '../auth.constants';
import type { TokenPayload } from '../auth.types';

const SESSION_INVALID = 'Invalid or expired session';

// Global guard (registered in AuthModule): every route requires a valid session
// unless it is marked @Public(). Checks, in order: access token cookie (ACC-19),
// user still exists, account not suspended or deactivated (ACC-15, ACC-16,
// ACC-12), 30 minutes of inactivity (ACC-06), temporary password (ACC-07a).
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const targets = [context.getHandler(), context.getClass()];

    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      targets,
    );
    if (isPublic) {
      // Public route: attach the user when there is a valid session, but never
      // reject. A guest, an expired session or a suspended account are all
      // treated as "nobody logged in". Real errors (for example the database
      // being down) are not hidden.
      try {
        request.user = await this.authenticate(request, false);
      } catch (err) {
        if (!(err instanceof HttpException)) {
          throw err;
        }
      }
      return true;
    }

    const user = await this.authenticate(request, true);
    request.user = user;

    const allowsPasswordChange = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PASSWORD_CHANGE_KEY,
      targets,
    );
    if (user.mustChangePassword && !allowsPasswordChange) {
      throw new ForbiddenException(
        'You must change your password before continuing',
      );
    }
    return true;
  }

  // touch = true records this request as activity (restarts the 30 minutes)
  private async authenticate(
    request: RequestWithUser,
    touch: boolean,
  ): Promise<AuthUser> {
    const token = request.cookies?.[ACCESS_COOKIE];
    if (!token) {
      throw new UnauthorizedException('Not logged in');
    }

    let payload: TokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<TokenPayload>(token);
    } catch {
      throw new UnauthorizedException(SESSION_INVALID);
    }
    // A refresh token must never work as an access token
    if (payload.typ !== 'access') {
      throw new UnauthorizedException(SESSION_INVALID);
    }

    const user = await this.usersService.findSessionUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException(SESSION_INVALID);
    }
    if (user.status === AccountStatus.Suspended) {
      throw new ForbiddenException('Account suspended');
    }
    if (user.status === AccountStatus.Deactivated) {
      throw new ForbiddenException('This account has been deactivated');
    }

    // No lastActivityAt means the session was ended (logout)
    const last = user.lastActivityAt?.getTime();
    if (!last || Date.now() - last > INACTIVITY_LIMIT_MINUTES * 60_000) {
      throw new UnauthorizedException('Session expired due to inactivity');
    }
    if (touch) {
      await this.usersService.touchActivity(user.id as string);
    }

    return {
      id: user.id as string,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      assignedProviderId: user.assignedProviderId
        ? user.assignedProviderId.toString()
        : null,
      preferredCurrency: user.preferredCurrency,
      mustChangePassword: user.mustChangePassword,
    };
  }
}