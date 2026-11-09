import type { Request } from 'express';
import type { AccountStatus } from '../enums/account-status.enum';
import type { Role } from '../enums/role.enum';

// The logged-in user, as returned by @CurrentUser().
// Ids are plain strings (not ObjectIds): compare with someHotel._id.toString().
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
  // Moderators only: the id of the one hotel or airline they manage (ACC-13).
  // null for users and admins.
  assignedProviderId: string | null;
  preferredCurrency: string;
  mustChangePassword: boolean;
}

// An Express request after the authentication guard ran.
// user is undefined on @Public() routes when nobody is logged in.
export type RequestWithUser = Request & {
  user?: AuthUser;
  cookies?: Record<string, string | undefined>;
};