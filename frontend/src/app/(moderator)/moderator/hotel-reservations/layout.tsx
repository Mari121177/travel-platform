import { RouteGuard } from "@/components/layout/RouteGuard";
import type { Role } from "@/lib/types";

const HOTEL_ROLES: Role[] = ["hotel_moderator"];

export default function HotelReservationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RouteGuard roles={HOTEL_ROLES}>{children}</RouteGuard>;
}
