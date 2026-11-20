import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AccountStatus } from '../../common/enums/account-status.enum';
import { Role } from '../../common/enums/role.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true, maxlength: 100 })
  name!: string;

  // Stored lowercase so the unique index is case-insensitive in practice (ACC-01)
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  // Salted bcrypt hash only (GEN-13). Never returned unless explicitly selected.
  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ type: String, enum: Object.values(Role), default: Role.User })
  role!: Role;

  @Prop({
    type: String,
    enum: Object.values(AccountStatus),
    default: AccountStatus.Active,
  })
  status!: AccountStatus;

  // Profile fields (ACC-09)
  @Prop({ type: String, trim: true })
  phone?: string;

  @Prop({ type: String, default: 'USD', uppercase: true, trim: true })
  preferredCurrency!: string;

  // Terms and privacy consent timestamp (ACC-01)
  @Prop({ type: Date, required: true })
  consentAcceptedAt!: Date;

  // Moderators only: the one airline or hotel they manage (ACC-13).
  // Airline _id for airline_moderator, hotel _id for hotel_moderator, null for others.
  @Prop({ type: Types.ObjectId, default: null })
  assignedProviderId!: Types.ObjectId | null;

  // Temporary password flows (ACC-07a, ACC-13)
  @Prop({ type: Boolean, default: false })
  mustChangePassword!: boolean;

  // Login lockout: 5 failures = 15 minutes (ACC-05)
  @Prop({ type: Number, default: 0 })
  failedLoginAttempts!: number;

  @Prop({ type: Date, default: null })
  lockUntil!: Date | null;

  // Hashed refresh token, cleared on logout (ACC-06, ACC-19)
  @Prop({ type: String, default: null, select: false })
  refreshTokenHash!: string | null;

  // Last authenticated request, used for the 30-minute inactivity expiry (ACC-06)
  @Prop({ type: Date, default: null })
  lastActivityAt!: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Admin account list filters by role and status (ACC-14)
UserSchema.index({ role: 1, status: 1 });