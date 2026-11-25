import { RouteGuard } from "@/components/layout/RouteGuard";
import type { Role } from "@/lib/types";

const AIRLINE_ROLES: Role[] = ["airline_moderator"];

export default function AirlineModeratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RouteGuard roles={AIRLINE_ROLES}>{children}</RouteGuard>;
}
