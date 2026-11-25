"use client";

import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | null;
  hint?: string;
  optional?: boolean;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      id,
      label,
      error,
      hint,
      optional = false,
      className,
      containerClassName,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const describedBy = error
      ? `${textareaId}-error`
      : hint
        ? `${textareaId}-hint`
        : undefined;

    return (
      <div className={cn("w-full", containerClassName)}>
        {label && (
          <label htmlFor={textareaId} className="field-label">
            {label}
            {optional && (
              <span className="ml-1 font-normal text-slate-400">(optional)</span>
            )}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
            error ? "border-red-400" : "border-line",
            className,
          )}
          {...props}
        />
        {error ? (
          <p id={`${textareaId}-error`} className="error-text">
            {error}
          </p>
        ) : hint ? (
          <p id={`${textareaId}-hint`} className="helper-text">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
