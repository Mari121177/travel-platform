import type { BadgeVariant } from "@/components/ui/Badge";
import type { AccountStatus, Role } from "@/lib/types";

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  active: "Active",
  suspended: "Suspended",
  deactivated: "Deactivated",
};

export const ACCOUNT_STATUS_VARIANTS: Record<AccountStatus, BadgeVariant> = {
  active: "success",
  suspended: "danger",
  deactivated: "neutral",
};

export const ASSIGNABLE_ROLES: Role[] = [
  "user",
  "admin",
  "airline_moderator",
  "hotel_moderator",
];

export const ACCOUNT_STATUSES: AccountStatus[] = [
  "active",
  "suspended",
  "deactivated",
];
