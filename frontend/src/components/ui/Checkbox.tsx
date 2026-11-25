"use client";

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  error?: string | null;
  hint?: string;
  containerClassName?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(
    {
      id,
      label,
      error,
      hint,
      className,
      containerClassName,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const checkboxId = id ?? generatedId;
    const describedBy = error
      ? `${checkboxId}-error`
      : hint
        ? `${checkboxId}-hint`
        : undefined;

    return (
      <div className={cn("w-full", containerClassName)}>
        <div className="flex items-start gap-2.5">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed",
              className,
            )}
            {...props}
          />
          {label && (
            <label
              htmlFor={checkboxId}
              className="cursor-pointer text-sm leading-5 text-slate-700"
            >
              {label}
            </label>
          )}
        </div>
        {error ? (
          <p id={`${checkboxId}-error`} className="error-text">
            {error}
          </p>
        ) : hint ? (
          <p id={`${checkboxId}-hint`} className="helper-text">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
