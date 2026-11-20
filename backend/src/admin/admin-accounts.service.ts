import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';
import { AccountStatus } from '../common/enums/account-status.enum';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { AirlinesService } from '../airlines/airlines.service';
import { HotelsService } from '../hotels/hotels.service';
import { NotificationType } from '../notifications/notification-type.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { AuditAction } from './audit-action';
import { AuditLogService } from './audit-log.service';
import {
  CreateModeratorDto,
  ModeratorType,
} from './dto/create-moderator.dto';
import { ListAccountsQueryDto } from './dto/list-accounts-query.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const PAGE_SIZE = 10;
const BCRYPT_ROUNDS = 10;

const escapeRegex = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type AccountDocument = UserDocument & { createdAt?: Date };

@Injectable()
export class AdminAccountsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly usersService: UsersService,
    private readonly hotelsService: HotelsService,
    private readonly airlinesService: AirlinesService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ACC-14: all accounts, newest first, 10 per page, search by name or email,
  // filter by role and status
  async list(query: ListAccountsQueryDto) {
    const page = query.page ?? 1;
    const filter: Record<string, unknown> = {};
    if (query.role) {
      filter.role = query.role;
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.q) {
      // Escaped, so characters like . or * in the search are plain text
      const text = new RegExp(escapeRegex(query.q), 'i');
      filter.$or = [{ name: text }, { email: text }];
    }

    const [rows, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('name email role status createdAt')
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE),
      this.userModel.countDocuments(filter),
    ]);

    return {
      items: rows.map((row) => this.toAccount(row)),
      page,
      limit: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  }

  // ACC-13: create a moderator linked to exactly one provider. The temporary
  // password must be replaced at the first login (mustChangePassword).
  async createModerator(admin: AuthUser, dto: CreateModeratorDto) {
    // Includes deactivated providers: an admin may still need a moderator for one.
    const provider =
      dto.type === ModeratorType.Hotel
        ? await this.hotelsService.findHotelForAdmin(dto.providerId)
        : await this.airlinesService.findAirlineForAdmin(dto.providerId);
    const role =
      dto.type === ModeratorType.Hotel
        ? Role.HotelModerator
        : Role.AirlineModerator;

    const email = dto.email.trim().toLowerCase();
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    // GEN-13: only a salted hash is stored
    const passwordHash = await bcrypt.hash(dto.temporaryPassword, BCRYPT_ROUNDS);

    let created: UserDocument;
    try {
      created = await this.usersService.create({
        name: dto.name,
        email,
        passwordHash,
        role,
        assignedProviderId: new Types.ObjectId(provider._id),
        mustChangePassword: true,
        // Admin-created accounts have no self-registration consent screen.
        consentAcceptedAt: new Date(),
      });
    } catch (err) {
      // Two admins using the same email at the same moment: the unique index decides
      if ((err as { code?: number }).code === 11000) {
        throw new ConflictException('Email is already registered');
      }
      throw err;
    }

    await this.auditLogService.record({
      admin,
      action: AuditAction.CreateModerator,
      targetType: 'user',
      targetId: created.id as string,
      targetLabel: created.email,
      details: {
        role: created.role,
        providerType: dto.type,
        providerId: provider._id.toString(),
      },
    });

    return {
      ...this.toAccount(created as AccountDocument),
      assignedProviderId: provider._id.toString(),
      mustChangePassword: true,
    };
  }

  // ACC-16, ACC-15: an active user or moderator becomes suspended
  async suspend(admin: AuthUser, id: string, reason?: string) {
    const target = await this.getManageableAccount(id, 'suspended');
    if (target.status === AccountStatus.Suspended) {
      throw new ConflictException('Account is already suspended');
    }
    if (target.status === AccountStatus.Deactivated) {
      throw new ConflictException(
        'This account was deactivated by its owner and cannot be suspended',
      );
    }

    // The status is part of the filter, so two admins acting at the same moment
    // cannot both succeed
    const updated = await this.userModel.findOneAndUpdate(
      { _id: id, status: AccountStatus.Active },
      { status: AccountStatus.Suspended },
      { new: true },
    );
    if (!updated) {
      throw new ConflictException(
        'The account status changed in the meantime. Reload and try again',
      );
    }

    const cleanReason = reason?.trim() || undefined;
    await this.auditLogService.record({
      admin,
      action: AuditAction.SuspendAccount,
      targetType: 'user',
      targetId: id,
      targetLabel: updated.email,
      details: { reason: cleanReason ?? null, role: updated.role },
    });
    await this.notificationsService.send(
      id,
      NotificationType.ACCOUNT_SUSPENDED,
      cleanReason
        ? `Your account has been suspended by an administrator. Reason: ${cleanReason}`
        : 'Your account has been suspended by an administrator.',
      cleanReason ? { reason: cleanReason } : undefined,
    );
    return this.toAccount(updated);
  }

  // ACC-16, ACC-15: a suspended account becomes active again
  async reactivate(admin: AuthUser, id: string) {
    const target = await this.getManageableAccount(id, 'reactivated');
    if (target.status === AccountStatus.Active) {
      throw new ConflictException('Account is already active');
    }
    if (target.status === AccountStatus.Deactivated) {
      throw new ConflictException(
        'This account was deactivated by its owner and cannot be reactivated here',
      );
    }

    const updated = await this.userModel.findOneAndUpdate(
      { _id: id, status: AccountStatus.Suspended },
      { status: AccountStatus.Active },
      { new: true },
    );
    if (!updated) {
      throw new ConflictException(
        'The account status changed in the meantime. Reload and try again',
      );
    }

    await this.auditLogService.record({
      admin,
      action: AuditAction.ReactivateAccount,
      targetType: 'user',
      targetId: id,
      targetLabel: updated.email,
      details: { role: updated.role },
    });
    await this.notificationsService.send(
      id,
      NotificationType.ACCOUNT_REACTIVATED,
      'Your account has been reactivated. You can log in again.',
    );
    return this.toAccount(updated);
  }

  // ACC-07a: sets a temporary password. The account must choose a new one at
  // its next login (the guard enforces that through mustChangePassword).
  async resetPassword(admin: AuthUser, id: string, dto: ResetPasswordDto) {
    const target = await this.getManageableAccount(id, 'reset');
    if (target.status === AccountStatus.Deactivated) {
      throw new ConflictException(
        'This account was deactivated by its owner, its password cannot be reset',
      );
    }

    // GEN-13: only a salted hash is stored
    const passwordHash = await bcrypt.hash(dto.temporaryPassword, BCRYPT_ROUNDS);
    const updated = await this.userModel.findOneAndUpdate(
      { _id: id, status: { $ne: AccountStatus.Deactivated } },
      {
        passwordHash,
        mustChangePassword: true,
        // Ends every open session and clears a lockout, so the account can
        // log in with the temporary password right away
        refreshTokenHash: null,
        lastActivityAt: null,
        failedLoginAttempts: 0,
        lockUntil: null,
      },
      { new: true },
    );
    if (!updated) {
      throw new ConflictException(
        'The account status changed in the meantime. Reload and try again',
      );
    }

    await this.auditLogService.record({
      admin,
      action: AuditAction.ResetPassword,
      targetType: 'user',
      targetId: id,
      targetLabel: updated.email,
      details: { role: updated.role },
    });
    return { ...this.toAccount(updated), mustChangePassword: true };
  }

  // 404 for an unknown id. Admin accounts are never managed here: an admin
  // cannot suspend or reset another admin, or themselves.
  private async getManageableAccount(id: string, verb: string) {
    const target = await this.userModel.findById(id);
    if (!target) {
      throw new NotFoundException('Account not found');
    }
    if (target.role === Role.Admin) {
      throw new ForbiddenException(
        `Admin accounts cannot be ${verb} through this route`,
      );
    }
    return target;
  }

  private toAccount(user: AccountDocument) {
    return {
      id: user.id as string,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      registeredAt: user.createdAt,
    };
  }
}
