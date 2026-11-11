import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateQuery } from 'mongoose';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly referenceData: ReferenceDataService,
  ) {}

  findByEmail(email: string) {
    return this.userModel.findOne({ email: email.trim().toLowerCase() });
  }

  // passwordHash is hidden by default, so it must be requested explicitly
  findByEmailWithPassword(email: string) {
    return this.userModel
      .findOne({ email: email.trim().toLowerCase() })
      .select('+passwordHash');
  }

  create(data: Partial<User>) {
    return this.userModel.create(data);
  }

  // Atomic increment, so simultaneous wrong passwords are all counted (ACC-05)
  incrementFailedLogins(id: string) {
    return this.userModel.findByIdAndUpdate(
      id,
      { $inc: { failedLoginAttempts: 1 } },
      { new: true },
    );
  }

  lockAccount(id: string, until: Date) {
    return this.userModel.findByIdAndUpdate(id, {
      failedLoginAttempts: 0,
      lockUntil: until,
    });
  }

  resetLoginState(id: string) {
    return this.userModel.findByIdAndUpdate(id, {
      failedLoginAttempts: 0,
      lockUntil: null,
    });
  }

  // Successful login: reset the counter, start the session, store the refresh token hash
  recordLogin(id: string, refreshTokenHash: string) {
    return this.userModel.findByIdAndUpdate(id, {
      failedLoginAttempts: 0,
      lockUntil: null,
      refreshTokenHash,
      lastActivityAt: new Date(),
    });
  }

  // Only the fields the authentication guard needs on every request
  findSessionUser(id: string) {
    return this.userModel
      .findById(id)
      .select(
        'name email role status assignedProviderId preferredCurrency mustChangePassword lastActivityAt',
      );
  }

  // Records an authenticated request (restarts the 30 minute inactivity timer, ACC-06)
  touchActivity(id: string) {
    return this.userModel.updateOne({ _id: id }, { lastActivityAt: new Date() });
  }

  // Logout: revokes the refresh token and ends the session (ACC-06)
  clearSession(id: string) {
    return this.userModel.updateOne(
      { _id: id },
      { refreshTokenHash: null, lastActivityAt: null },
    );
  }

  // Refresh: swaps the stored refresh token hash only if it still matches the
  // token that was presented. One atomic step, so two requests with the same
  // old token cannot both succeed (ACC-06, ACC-19).
  rotateRefreshToken(id: string, oldHash: string, newHash: string) {
    return this.userModel.findOneAndUpdate(
      { _id: id, refreshTokenHash: oldHash },
      { refreshTokenHash: newHash },
      { new: true },
    );
  }

  // Change password: the hash is hidden by default, so it must be requested
  // explicitly (ACC-08)
  findByIdWithPassword(id: string) {
    return this.userModel.findById(id).select('+passwordHash');
  }

  // Stores the new password hash, ends the temporary-password state and
  // replaces the refresh token, so every older refresh token stops working
  // (ACC-08, ACC-07a)
  updatePassword(id: string, passwordHash: string, refreshTokenHash: string) {
    return this.userModel.findByIdAndUpdate(
      id,
      { passwordHash, mustChangePassword: false, refreshTokenHash },
      { new: true },
    );
  }

  // GET /users/me (ACC-09)
  async getProfile(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired session');
    }
    return this.toProfile(user);
  }

  // PATCH /users/me (ACC-09): name, phone and preferred currency. Nothing is
  // written unless every field that was sent is valid.
  async updateProfile(id: string, dto: UpdateProfileDto) {
    const set: Record<string, string> = {};
    const unset: Record<string, 1> = {};

    if (dto.name !== undefined) {
      set.name = dto.name;
    }
    if (dto.phone === null) {
      unset.phone = 1; // an empty phone removes it
    } else if (dto.phone !== undefined) {
      set.phone = dto.phone;
    }
    if (dto.preferredCurrency !== undefined) {
      const supported = await this.referenceData.isSupportedCurrency(
        dto.preferredCurrency,
      );
      if (!supported) {
        const list = await this.referenceData.getSupportedCurrencies();
        throw new BadRequestException([
          `preferredCurrency must be one of: ${list.join(', ')}`,
        ]);
      }
      set.preferredCurrency = dto.preferredCurrency;
    }

    if (Object.keys(set).length === 0 && Object.keys(unset).length === 0) {
      throw new BadRequestException([
        'Provide at least one field to update: name, phone or preferredCurrency',
      ]);
    }

    const update: UpdateQuery<UserDocument> = {};
    if (Object.keys(set).length > 0) {
      update.$set = set;
    }
    if (Object.keys(unset).length > 0) {
      update.$unset = unset;
    }
    const user = await this.userModel.findByIdAndUpdate(id, update, {
      new: true,
    });
    if (!user) {
      throw new UnauthorizedException('Invalid or expired session');
    }
    return this.toProfile(user);
  }

  // Only what the profile page needs. Password hash, lockout and token fields
  // are never returned.
  private toProfile(user: UserDocument) {
    return {
      id: user.id as string,
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
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