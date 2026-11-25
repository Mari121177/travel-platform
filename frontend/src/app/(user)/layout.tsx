import { AppShell } from "@/components/layout/AppShell";
import { RouteGuard } from "@/components/layout/RouteGuard";
import type { Role } from "@/lib/types";

const USER_ROLES: Role[] = ["user"];

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard roles={USER_ROLES}>
      <AppShell>{children}</AppShell>
    </RouteGuard>
  );
}
