import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { AccountStatus } from '../common/enums/account-status.enum';
import { Role } from '../common/enums/role.enum';
import { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  LOCK_MINUTES,
  MAX_FAILED_LOGINS,
  REFRESH_TOKEN_TTL_SECONDS,
} from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 10;

// ACC-04: the same message for an unknown email and a wrong password
const INVALID_CREDENTIALS = 'Invalid email or password';

// Compared against when the email does not exist, so response time does not
// reveal whether an account exists
const DUMMY_HASH = bcrypt.hashSync('dummy-password-1', BCRYPT_ROUNDS);

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // ACC-01
  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    // GEN-13: only a salted hash is stored
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    try {
      const user = await this.usersService.create({
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: Role.User, // public registration can only create normal users
        consentAcceptedAt: new Date(),
      });
      return this.toPublicUser(user);
    } catch (err) {
      // Two simultaneous requests with the same email: the unique index decides
      if ((err as { code?: number }).code === 11000) {
        throw new ConflictException('Email is already registered');
      }
      throw err;
    }
  }

  // ACC-04, ACC-05
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    if (!user) {
      await bcrypt.compare(dto.password, DUMMY_HASH);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // Still locked: reject even if the password is correct
    if (user.lockUntil && user.lockUntil > new Date()) {
      throw this.lockedException(user.lockUntil);
    }
    // Lock has expired: start again from zero failures
    if (user.lockUntil) {
      await this.usersService.resetLoginState(user.id as string);
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      const updated = await this.usersService.incrementFailedLogins(
        user.id as string,
      );
      if (updated && updated.failedLoginAttempts >= MAX_FAILED_LOGINS) {
        const until = new Date(Date.now() + LOCK_MINUTES * 60_000);
        await this.usersService.lockAccount(user.id as string, until);
        throw this.lockedException(until);
      }
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // Status is checked only after the password is correct (ACC-04, ACC-12, ACC-15, ACC-16)
    if (user.status === AccountStatus.Suspended) {
      throw new ForbiddenException('Account suspended');
    }
    if (user.status === AccountStatus.Deactivated) {
      throw new ForbiddenException('This account has been deactivated');
    }

    const { accessToken, refreshToken } = await this.issueTokens(
      user.id as string,
    );
    await this.usersService.recordLogin(
      user.id as string,
      sha256(refreshToken),
    );

    return { accessToken, refreshToken, user: this.toPublicUser(user) };
  }

  private async issueTokens(userId: string) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, typ: 'access' },
      { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    );
    // jti makes every refresh token unique, even if issued in the same second
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, typ: 'refresh', jti: randomUUID() },
      { expiresIn: REFRESH_TOKEN_TTL_SECONDS },
    );
    return { accessToken, refreshToken };
  }

  // 423 Locked has no named constant in Nest's HttpStatus enum
  private lockedException(until: Date) {
    const minutes = Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60_000));
    return new HttpException(
      `Too many failed login attempts. Your account is locked for ${minutes} more minute(s).`,
      423,
    );
  }

  private toPublicUser(user: UserDocument) {
    return {
      id: user.id as string,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      preferredCurrency: user.preferredCurrency,
      mustChangePassword: user.mustChangePassword,
    };
  }
}