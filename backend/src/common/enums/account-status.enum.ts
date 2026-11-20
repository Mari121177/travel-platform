export const AccountStatus = {
  Active: 'active',
  Suspended: 'suspended', // by admin (ACC-15, ACC-16)
  Deactivated: 'deactivated', // by the user (ACC-12)
} as const;

export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];