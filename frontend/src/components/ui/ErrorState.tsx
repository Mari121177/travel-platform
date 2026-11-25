"use client";

import type { ReactNode } from "react";
import { Button } from "./Button";
import { AlertCircle } from "./icons";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  messages?: string[];
  onRetry?: () => void;
  retryLabel?: string;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  messages,
  onRetry,
  retryLabel = "Try again",
  action,
  className,
}: ErrorStateProps) {
  const details = messages?.length
    ? messages
    : message
      ? [message]
      : ["We could not load this right now. Please try again."];

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/60 px-6 py-12 text-center ${className ?? ""}`}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-red-900">{title}</h3>
      <div className="mt-1 max-w-lg space-y-1 text-sm text-red-700">
        {details.map((detail, index) => (
          <p key={index}>{detail}</p>
        ))}
      </div>
      {(onRetry || action) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
