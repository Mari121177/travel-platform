"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "@/components/ui/icons";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/utils";

export interface NotificationBellProps {
  className?: string;
}

export const NOTIFICATIONS_UPDATED_EVENT = "notifications:updated";

export function NotificationBell({ className }: NotificationBellProps) {
  const { user, status } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnread = useCallback(async () => {
    try {
      const result = await api.get<{ unreadCount: number }>(
        "/notifications/unread-count",
      );
      setUnreadCount(Number(result.unreadCount) || 0);
    } catch {
      // The badge is cosmetic; a failure must not break the page.
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      setUnreadCount(0);
      return;
    }

    void loadUnread();

    const onVisible = () => {
      if (document.visibilityState === "visible") void loadUnread();
    };
    const onUpdated = () => {
      void loadUnread();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdated);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdated);
    };
  }, [status, user, loadUnread]);

  if (status !== "authenticated" || !user) return null;

  const label =
    unreadCount > 0
      ? `Notifications, ${unreadCount} unread`
      : "Notifications";

  return (
    <Link
      href="/notifications"
      aria-label={label}
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900",
        className,
      )}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
