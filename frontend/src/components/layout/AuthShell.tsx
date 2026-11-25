"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { Check, Sparkles } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth/AuthProvider";
import { homePathForRole } from "@/lib/auth/roles";
import { Logo } from "./Logo";

const benefits = [
  "Search flights and hotels in one place",
  "Build day-by-day itineraries and budgets",
  "Share your trips with the community",
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated" || !user) return;

    if (user.mustChangePassword) {
      router.replace("/profile?password=required");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    const safeNext =
      next && next.startsWith("/") && !next.startsWith("//") ? next : null;

    router.replace(safeNext ?? homePathForRole(user.role));
  }, [status, user, router]);

  if (status === "loading") {
    return <FullPageSpinner label="Checking your session…" />;
  }

  if (status === "authenticated" && user) {
    return <FullPageSpinner label="Redirecting…" />;
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 p-10 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-brand-300/20 blur-3xl" />
        <div className="relative">
          <Logo variant="light" />
        </div>
        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-50 ring-1 ring-white/20">
            <Sparkles className="h-3.5 w-3.5" />
            Plan less. Travel more.
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-tight text-white">
            Your whole trip, in one place.
          </h1>
          <p className="mt-4 text-brand-50/90">
            Search flights and hotels, build a day-by-day itinerary, keep your
            budget in check, and share the journey.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-brand-100/70">
          Software Project I · Winter 2026
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center lg:hidden">
            <Logo />
          </div>
          <div className="card-surface p-6 sm:p-8">{children}</div>
          <p className="mt-6 text-center text-xs text-slate-400">
            <Link href="/" className="transition hover:text-brand-700">
              ← Back to home
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
