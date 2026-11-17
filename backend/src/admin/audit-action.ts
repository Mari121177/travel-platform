// What an admin can do that is written to the audit log (GEN-07).
// Add a value here when a new admin action is built (for example hiding content).
export const AuditAction = {
  SuspendAccount: 'SUSPEND_ACCOUNT',
  ReactivateAccount: 'REACTIVATE_ACCOUNT',
  ResetPassword: 'RESET_PASSWORD',
  CreateModerator: 'CREATE_MODERATOR',
  DeactivateProvider: 'DEACTIVATE_PROVIDER',
  ReactivateProvider: 'REACTIVATE_PROVIDER',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
