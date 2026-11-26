import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success";

export type ButtonSize = "sm" | "md" | "lg";

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800",
  secondary:
    "bg-brand-500 text-white shadow-sm hover:bg-brand-600 active:bg-brand-700",
  outline:
    "border border-brand-200 bg-white text-brand-700 hover:bg-brand-50 active:bg-brand-100",
  ghost: "text-brand-700 hover:bg-brand-50 hover:text-brand-800",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800",
  success:
    "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
  fullWidth = false,
): string {
  return cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && "w-full",
    className,
  );
}
