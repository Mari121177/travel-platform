"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "@/components/ui/icons";
import { buttonClasses } from "@/lib/ui";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";

const links = [
  { href: "/flights", label: "Flights" },
  { href: "/hotels", label: "Hotels" },
  { href: "/itineraries/public", label: "Itineraries" },
  { href: "/blog", label: "Stories" },
];

export function PublicHeader() {
  const { user, status } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const authenticated = status === "authenticated" && user;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Main navigation"
          >
            {links.map((link) => {
              const active =
                pathname === link.href ||
                pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {status === "loading" ? (
            <div className="skeleton h-9 w-32" aria-hidden="true" />
          ) : authenticated ? (
            <>
              <NotificationBell />
              <UserMenu />
            </>
          ) : (
            <>
              <Link href="/login" className={buttonClasses("ghost", "md")}>
                Log in
              </Link>
              <Link href="/register" className={buttonClasses("primary", "md")}>
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 md:hidden"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-line bg-white md:hidden">
          <div className="container-page space-y-1 py-3">
            {links.map((link) => {
              const active =
                pathname === link.href ||
                pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "block rounded-lg px-3 py-2.5 text-sm font-medium transition",
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="mt-3 border-t border-line pt-3">
              {authenticated ? (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-2 py-2">
                  <UserMenu />
                  <NotificationBell />
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    className={buttonClasses("outline", "md", undefined, true)}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className={buttonClasses("primary", "md", undefined, true)}
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
