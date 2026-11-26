import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-brand-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-sm text-brand-100 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          © {year} {siteConfig.name}. Travel planning made simple.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/" className="transition hover:text-white">
            Home
          </Link>
          <Link href="/profile" className="transition hover:text-white">
            Profile
          </Link>
          <Link href="/notifications" className="transition hover:text-white">
            Notifications
          </Link>
        </div>
      </div>
    </footer>
  );
}
