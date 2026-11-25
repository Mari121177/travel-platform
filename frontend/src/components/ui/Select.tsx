"use client";

import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "./icons";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string | null;
  hint?: string;
  optional?: boolean;
  placeholder?: string;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      id,
      label,
      error,
      hint,
      optional = false,
      placeholder,
      className,
      containerClassName,
      children,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const describedBy = error
      ? `${selectId}-error`
      : hint
        ? `${selectId}-hint`
        : undefined;

    return (
      <div className={cn("w-full", containerClassName)}>
        {label && (
          <label htmlFor={selectId} className="field-label">
            {label}
            {optional && (
              <span className="ml-1 font-normal text-slate-400">(optional)</span>
            )}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              "block w-full appearance-none rounded-xl border bg-white py-2.5 pl-3.5 pr-10 text-sm text-ink shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
              error ? "border-red-400" : "border-line",
              className,
            )}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {children}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
        {error ? (
          <p id={`${selectId}-error`} className="error-text">
            {error}
          </p>
        ) : hint ? (
          <p id={`${selectId}-hint`} className="helper-text">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
