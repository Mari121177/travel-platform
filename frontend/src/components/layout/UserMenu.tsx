"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  Home,
  LogOut,
  User,
} from "@/components/ui/icons";
import { useAuth } from "@/lib/auth/AuthProvider";
import { homePathForRole, ROLE_LABELS } from "@/lib/auth/roles";
import { cn, initials } from "@/lib/utils";

export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
    setOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl p-1.5 pr-2 transition hover:bg-slate-100"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
          {initials(user.name)}
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-slate-700 sm:block">
          {user.name}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-400 transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-64 animate-fade-in overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-pop"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-ink">
              {user.name}
            </p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
            <span className="mt-1.5 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {ROLE_LABELS[user.role]}
            </span>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link
            href={homePathForRole(user.role)}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
          >
            <Home className="h-4 w-4 text-slate-400" />
            Dashboard
          </Link>
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
          >
            <User className="h-4 w-4 text-slate-400" />
            My profile
          </Link>
          <Link
            href="/notifications"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
          >
            <Bell className="h-4 w-4 text-slate-400" />
            Notifications
          </Link>
          <div className="my-1 h-px bg-line" />
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
