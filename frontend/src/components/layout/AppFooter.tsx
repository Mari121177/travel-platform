import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          © {year} {siteConfig.name}. Travel planning made simple.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/" className="transition hover:text-brand-700">
            Home
          </Link>
          <Link href="/profile" className="transition hover:text-brand-700">
            Profile
          </Link>
          <Link href="/notifications" className="transition hover:text-brand-700">
            Notifications
          </Link>
        </div>
      </div>
    </footer>
  );
}
