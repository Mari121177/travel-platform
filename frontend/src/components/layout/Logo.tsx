import Link from "next/link";
import { Compass } from "@/components/ui/icons";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export interface LogoProps {
  href?: string;
  compact?: boolean;
  variant?: "dark" | "light";
  className?: string;
}

export function Logo({
  href = "/",
  compact = false,
  variant = "dark",
  className,
}: LogoProps) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5", className)}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl",
          variant === "dark"
            ? "bg-brand-600 text-white shadow-sm"
            : "bg-white/10 text-white ring-1 ring-white/20",
        )}
      >
        <Compass className="h-5 w-5" />
      </span>
      {!compact && (
        <span
          className={cn(
            "text-lg font-bold tracking-tight",
            variant === "dark" ? "text-ink" : "text-white",
          )}
        >
          {siteConfig.name}
        </span>
      )}
    </Link>
  );
}
