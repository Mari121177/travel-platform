import { cn } from "@/lib/utils";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const sizeClasses: Record<NonNullable<SpinnerProps["size"]>, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-5 w-5 border-2",
  lg: "h-8 w-8 border-[3px]",
};

export function Spinner({ size = "md", className, label = "Loading" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block animate-spin rounded-full border-current border-r-transparent",
        sizeClasses[size],
        className,
      )}
    >
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function FullPageSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Spinner size="lg" className="text-brand-600" label={label} />
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}
