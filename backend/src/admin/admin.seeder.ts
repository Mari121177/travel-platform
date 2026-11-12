import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { isEmail } from 'class-validator';
import { Model } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import { PASSWORD_REGEX } from '../common/validation/password';
import { User, UserDocument } from '../users/schemas/user.schema';

const BCRYPT_ROUNDS = 10;

// ACC-18: the admin account is created here at startup, never through
// registration. Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env. Safe to run
// on every start: an existing account is never changed.
@Injectable()
export class AdminSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeeder.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.seedAdmin();
    } catch (err) {
      // Do not stop the whole backend, but make the problem impossible to miss
      this.logger.error(`Admin seeding failed: ${(err as Error).message}`);
    }
  }

  private async seedAdmin() {
    const email = this.config.get<string>('ADMIN_EMAIL')?.trim().toLowerCase();
    const password = this.config.get<string>('ADMIN_PASSWORD');
    const name = this.config.get<string>('ADMIN_NAME')?.trim() || 'Administrator';

    if (!email || !password) {
      this.logger.warn(
        'ADMIN_EMAIL and ADMIN_PASSWORD are not set in .env: no admin account was seeded (ACC-18)',
      );
      return;
    }
    if (!isEmail(email)) {
      this.logger.error('ADMIN_EMAIL is not a valid email: no admin account was seeded');
      return;
    }
    if (!PASSWORD_REGEX.test(password) || password.length > 64) {
      this.logger.error(
        'ADMIN_PASSWORD must have 8 to 64 characters with at least one letter and one digit: no admin account was seeded',
      );
      return;
    }
    if (name.length > 100) {
      this.logger.error('ADMIN_NAME is longer than 100 characters: no admin account was seeded');
      return;
    }

    const existing = await this.userModel.findOne({ email });
    if (existing) {
      if (existing.role === Role.Admin) {
        this.logger.log(`Admin account ${email} already exists`);
      } else {
        // Never turn a normal account into an admin silently
        this.logger.warn(
          `${email} already exists and is not an admin. It was not changed. Use another ADMIN_EMAIL`,
        );
      }
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    try {
      await this.userModel.create({
        name,
        email,
        passwordHash,
        role: Role.Admin,
        consentAcceptedAt: new Date(),
      });
      this.logger.log(`Admin account ${email} created`);
    } catch (err) {
      // Two developers starting the app at the same moment: the unique email
      // index decides, and the duplicate is harmless
      if ((err as { code?: number }).code !== 11000) {
        throw err;
      }
    }
  }
}
