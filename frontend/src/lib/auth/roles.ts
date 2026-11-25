import type { Role } from "@/lib/types";

export const ROLE_LABELS: Record<Role, string> = {
  user: "Traveler",
  admin: "Administrator",
  airline_moderator: "Airline moderator",
  hotel_moderator: "Hotel moderator",
};

export const ALL_ROLES: Role[] = [
  "user",
  "admin",
  "airline_moderator",
  "hotel_moderator",
];

export const MODERATOR_ROLES: Role[] = [
  "airline_moderator",
  "hotel_moderator",
];

export function isModerator(role: Role | null | undefined): boolean {
  return role === "airline_moderator" || role === "hotel_moderator";
}

export function homePathForRole(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin/accounts";
    case "airline_moderator":
      return "/moderator/airline";
    case "hotel_moderator":
      return "/moderator/hotel";
    default:
      return "/";
  }
}
