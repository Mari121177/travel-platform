"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, Check, Info, X } from "./icons";

export type AlertVariant = "info" | "success" | "warning" | "error";

const containerClasses: Record<AlertVariant, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-900",
};

const iconClasses: Record<AlertVariant, string> = {
  info: "text-sky-600",
  success: "text-emerald-600",
  warning: "text-amber-600",
  error: "text-red-600",
};

export interface AlertProps {
  variant?: AlertVariant;
  title?: ReactNode;
  children?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({
  variant = "info",
  title,
  children,
  onDismiss,
  className,
}: AlertProps) {
  const Icon =
    variant === "success"
      ? Check
      : variant === "warning"
        ? AlertTriangle
        : variant === "error"
          ? AlertCircle
          : Info;

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        containerClasses[variant],
        className,
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconClasses[variant])} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && (
          <div className={cn(title ? "mt-0.5" : "", "leading-6")}>
            {children}
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="rounded-md p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
