"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "@/components/ui/icons";
import { buttonClasses } from "@/lib/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card-surface w-full max-w-md p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-ink">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          An unexpected error occurred. You can try again or go back to the
          home page.
        </p>
        <div className="mt-6 flex flex-col-reverse justify-center gap-2 sm:flex-row">
          <Link href="/" className={buttonClasses("outline", "md")}>
            Go home
          </Link>
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </div>
  );
}
