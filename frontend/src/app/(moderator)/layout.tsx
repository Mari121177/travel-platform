import { AppShell } from "@/components/layout/AppShell";
import { RouteGuard } from "@/components/layout/RouteGuard";
import { MODERATOR_ROLES } from "@/lib/auth/roles";

export default function ModeratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard roles={MODERATOR_ROLES}>
      <AppShell>{children}</AppShell>
    </RouteGuard>
  );
}
