import { AppShell } from "@/components/layout/AppShell";
import { RouteGuard } from "@/components/layout/RouteGuard";
import type { Role } from "@/lib/types";

const ADMIN_ROLES: Role[] = ["admin"];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard roles={ADMIN_ROLES}>
      <AppShell>{children}</AppShell>
    </RouteGuard>
  );
}
