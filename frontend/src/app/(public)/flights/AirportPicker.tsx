"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { Input } from "@/components/ui/Input";
import type { Airport, Paged } from "./types";

interface AirportPickerProps {
  label: string;
  value: string; // chosen IATA code, "" if nothing chosen yet
  onChange: (code: string) => void;
  error?: string | null;
}

export function AirportPicker({
  label,
  value,
  onChange,
  error,
}: AirportPickerProps) {
  const [text, setText] = useState(value);
  const [options, setOptions] = useState<Airport[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // search 300ms after the user stops typing; abort stale requests
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        const res = await api.get<Paged<Airport>>("/airports", {
          query: { q: text.trim() },
          signal: controller.signal,
        });
        setOptions(res.data);
      } catch {
        if (controller.signal.aborted) return;
        setFailed(true);
        setOptions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, open]);

  // close the list when clicking elsewhere
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function choose(airport: Airport) {
    setText(airport.iataCode);
    onChange(airport.iataCode);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <Input
        label={label}
        value={text}
        placeholder="City or airport code"
        autoComplete="off"
        error={error}
        onFocus={(e) => {
          e.target.select();
          setOpen(true);
        }}
        onChange={(e) => {
          setText(e.target.value);
          onChange(""); // typing again means no airport is chosen yet
          setOpen(true);
        }}
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-line bg-white shadow-lg">
          {loading && (
            <li className="px-3 py-2 text-sm text-slate-500">Searching…</li>
          )}
          {failed && (
            <li className="px-3 py-2 text-sm text-red-600">
              Could not load airports. Keep typing to retry.
            </li>
          )}
          {!loading && !failed && options.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">
              No airports found
            </li>
          )}
          {!loading &&
            options.map((airport) => (
              <li key={airport.iataCode}>
                <button
                  type="button"
                  onClick={() => choose(airport)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
                >
                  <span className="font-medium">{airport.iataCode}</span> ·{" "}
                  {airport.name}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}