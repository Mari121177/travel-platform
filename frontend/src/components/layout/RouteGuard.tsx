"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth/AuthProvider";
import { homePathForRole } from "@/lib/auth/roles";
import type { Role } from "@/lib/types";

export interface RouteGuardProps {
  roles?: Role[];
  children: React.ReactNode;
}

export function RouteGuard({ roles, children }: RouteGuardProps) {
  const { user, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const wrongRole = Boolean(
    user && roles && !roles.includes(user.role),
  );
  const mustChangePassword = Boolean(user?.mustChangePassword) && pathname !== "/profile";

  useEffect(() => {
    if (status === "loading") return;

    if (!user) {
      const nextPath = `${pathname || "/"}${window.location.search}${window.location.hash}`;
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    if (roles && !roles.includes(user.role)) {
      router.replace(homePathForRole(user.role));
      return;
    }

    if (user.mustChangePassword && pathname !== "/profile") {
      router.replace("/profile?password=required");
    }
  }, [status, user, roles, pathname, router]);

  if (status === "loading" || !user || wrongRole || mustChangePassword) {
    return <FullPageSpinner label="Checking your session…" />;
  }

  return <>{children}</>;
}
