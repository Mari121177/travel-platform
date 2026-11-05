import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  // ACC-01, ACC-03
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

      return {
        id: user.id as string,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        preferredCurrency: user.preferredCurrency,
      };
    } catch (err) {
      // Two simultaneous requests with the same email: the unique index decides
      if ((err as { code?: number }).code === 11000) {
        throw new ConflictException('Email is already registered');
      }
      throw err;
    }
  }
}