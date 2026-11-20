import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { AuditAction } from './audit-action';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { AuditLog } from './schemas/audit-log.schema';

const PAGE_SIZE = 10;

export interface AuditEntry {
  admin: AuthUser;
  action: AuditAction;
  targetType: string;
  targetId: string;
  targetLabel?: string;
  // Never put passwords or tokens here
  details?: Record<string, unknown>;
}

// GEN-07. Other admin features call record() after they change something.
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLog>,
  ) {}

  // A failed log write must not undo or hide an action that already happened,
  // so the error is written to the terminal instead of being thrown.
  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.auditModel.create({
        adminId: new Types.ObjectId(entry.admin.id),
        adminEmail: entry.admin.email,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        targetLabel: entry.targetLabel,
        details: entry.details ?? {},
      });
    } catch (err) {
      this.logger.error(
        `Could not write the audit log for ${entry.action} on ${entry.targetType} ${entry.targetId}: ${(err as Error).message}`,
      );
    }
  }

  // GET /admin/audit-logs: newest first, 10 per page
  async list(query: ListAuditLogsQueryDto) {
    const page = query.page ?? 1;
    const filter: Record<string, unknown> = {};
    if (query.action) {
      filter.action = query.action;
    }
    if (query.targetId) {
      filter.targetId = query.targetId;
    }

    const [rows, total] = await Promise.all([
      this.auditModel
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      this.auditModel.countDocuments(filter),
    ]);

    return {
      items: rows.map((row) => ({
        id: String(row._id),
        adminId: String(row.adminId),
        adminEmail: row.adminEmail,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId,
        targetLabel: row.targetLabel ?? null,
        details: row.details ?? {},
        createdAt: row.createdAt,
      })),
      page,
      limit: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  }
}
