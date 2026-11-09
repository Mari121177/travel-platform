import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
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
}