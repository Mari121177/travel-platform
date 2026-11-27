"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export interface FilterValues {
  sortBy: string; // price | duration | departureTime
  order: string; // asc | desc
  minPrice: string; // "" = no limit
  maxPrice: string;
}

export const DEFAULT_FILTERS: FilterValues = {
  sortBy: "price",
  order: "asc",
  minPrice: "",
  maxPrice: "",
};

const SORT_OPTIONS = [
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "duration-asc", label: "Duration: shortest first" },
  { value: "duration-desc", label: "Duration: longest first" },
  { value: "departureTime-asc", label: "Departure: earliest first" },
  { value: "departureTime-desc", label: "Departure: latest first" },
];

export function FilterBar({
  values,
  onChange,
}: {
  values: FilterValues;
  onChange: (next: FilterValues) => void;
}) {
  const [min, setMin] = useState(values.minPrice);
  const [max, setMax] = useState(values.maxPrice);
  const [error, setError] = useState<string | null>(null);

  function applyPrice() {
    const lo = min.trim() === "" ? null : Number(min);
    const hi = max.trim() === "" ? null : Number(max);
    if (
      (lo !== null && (!Number.isFinite(lo) || lo < 0)) ||
      (hi !== null && (!Number.isFinite(hi) || hi < 0))
    ) {
      setError("Prices must be 0 or more");
      return;
    }
    if (lo !== null && hi !== null && lo > hi) {
      setError("Minimum price cannot be above maximum");
      return;
    }
    setError(null);
    onChange({ ...values, minPrice: min.trim(), maxPrice: max.trim() });
  }

  function reset() {
    setMin("");
    setMax("");
    setError(null);
    onChange(DEFAULT_FILTERS);
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Select
          label="Sort by"
          value={`${values.sortBy}-${values.order}`}
          onChange={(e) => {
            const [sortBy, order] = e.target.value.split("-");
            onChange({ ...values, sortBy, order });
          }}
          containerClassName="lg:col-span-2"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Input
          label="Min price"
          type="number"
          min={0}
          value={min}
          onChange={(e) => setMin(e.target.value)}
          placeholder="Any"
        />
        <Input
          label="Max price"
          type="number"
          min={0}
          value={max}
          onChange={(e) => setMax(e.target.value)}
          placeholder="Any"
        />
        <div className="flex items-end gap-2 pt-6">
          <Button type="button" onClick={applyPrice}>
            Apply
          </Button>
          <Button type="button" variant="outline" onClick={reset}>
            Reset
          </Button>
        </div>
      </div>
      {error && <p className="error-text">{error}</p>}
    </Card>
  );
}