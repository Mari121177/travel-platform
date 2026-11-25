import Link from "next/link";
import { Compass } from "@/components/ui/icons";
import { buttonClasses } from "@/lib/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
          <Compass className="h-7 w-7" />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-brand-600">
          404
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The page you are looking for does not exist or has moved.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Link href="/" className={buttonClasses("primary", "md")}>
            Back to home
          </Link>
          <Link href="/flights" className={buttonClasses("outline", "md")}>
            Search flights
          </Link>
        </div>
      </div>
    </div>
  );
}
