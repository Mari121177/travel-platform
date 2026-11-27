"use client";

import { useRef, useState } from "react";
import { Calendar } from "@/components/ui/icons";
import { Input } from "@/components/ui/Input";

// "2026-12-20" -> "20/12/2026"
function toDisplay(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
}

// digits only -> "20/12/2026" as the user types
function formatDigits(digits: string): string {
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
    .filter(Boolean)
    .join("/");
}

// "20/12/2026" -> "2026-12-20", or null if it is not a real date
function toIso(display: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  const real =
    date.getFullYear() === Number(yyyy) &&
    date.getMonth() === Number(mm) - 1 &&
    date.getDate() === Number(dd);
  return real ? `${yyyy}-${mm}-${dd}` : null;
}

interface DateFieldProps {
  label: string;
  value: string; // ISO "YYYY-MM-DD", "" when empty or incomplete
  onChange: (iso: string) => void;
  error?: string | null;
  min?: string; // ISO date: earliest day the calendar lets you pick
}

export function DateField({
  label,
  value,
  onChange,
  error,
  min,
}: DateFieldProps) {
  const [text, setText] = useState(toDisplay(value));
  const [bad, setBad] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);

  function handleChange(raw: string) {
    // allow pasting an ISO date such as 2026-12-20
    const source = /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())
      ? toDisplay(raw.trim())
      : raw;
    const digits = source.replace(/\D/g, "").slice(0, 8);
    const next = formatDigits(digits);
    setText(next);

    if (digits.length < 8) {
      setBad(false);
      onChange("");
      return;
    }
    const iso = toIso(next);
    setBad(iso === null);
    onChange(iso ?? "");
  }

  function openCalendar() {
    const picker = pickerRef.current;
    if (!picker) return;
    try {
      picker.showPicker();
    } catch {
      picker.focus(); // browsers without showPicker
    }
  }

  return (
    <div className="relative">
      <Input
        label={label}
        inputMode="numeric"
        autoComplete="off"
        placeholder="DD/MM/YYYY"
        maxLength={10}
        className="pr-11"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        error={bad ? "Enter a real date, like 20/12/2026" : error}
      />

      {/* hidden native date input: it only provides the calendar popup */}
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        min={min}
        value={value}
        onChange={(e) => {
          if (!e.target.value) return;
          setText(toDisplay(e.target.value));
          setBad(false);
          onChange(e.target.value);
        }}
        className="pointer-events-none absolute right-2 top-[31px] h-8 w-8 opacity-0"
      />
      <button
        type="button"
        onClick={openCalendar}
        aria-label={`Open calendar for ${label}`}
        className="absolute right-2 top-[31px] flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-brand-50 hover:text-brand-700"
      >
        <Calendar className="h-5 w-5" />
      </button>
    </div>
  );
}