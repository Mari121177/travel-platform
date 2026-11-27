"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AirportPicker } from "./AirportPicker";
import { DateField } from "./DateField";
import type { CabinClass } from "./types";

export interface SearchValues {
  origin: string;
  destination: string;
  departureDate: string; // YYYY-MM-DD
  returnDate: string; // "" = one-way
  adults: number;
  children: number;
  infants: number;
  cabin: CabinClass | "";
}

const CABINS: CabinClass[] = ["Economy", "Premium Economy", "Business", "First"];

function todayLocal(): string {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
}

export function SearchForm({
  initial,
  onSearch,
}: {
  initial: SearchValues;
  onSearch: (values: SearchValues) => void;
}) {
  const [values, setValues] = useState<SearchValues>(initial);
  const [roundTrip, setRoundTrip] = useState(initial.returnDate !== "");
  const [counts, setCounts] = useState({
    adults: String(initial.adults),
    children: String(initial.children),
    infants: String(initial.infants),
    });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setCount(key: "adults" | "children" | "infants", value: string) {
    setCounts((prev) => ({ ...prev, [key]: value }));
  }

// typing a digit while the box shows "0" replaces it ("05" becomes "5")
function setCountClean(key: "children" | "infants", value: string) {
  setCount(key, value.replace(/^0+(?=\d)/, ""));
}
    // on blur: an empty, negative or non-whole number goes back to the minimum
    // (1 for adults, 0 for children and infants)
    function resetCount(key: "adults" | "children" | "infants") {
    const min = key === "adults" ? 1 : 0;
    setCounts((prev) => {
        const n = Number(prev[key]);
        const invalid = prev[key].trim() === "" || !Number.isInteger(n) || n < min;
        return invalid ? { ...prev, [key]: String(min) } : prev;
    });
    }
  function set<K extends keyof SearchValues>(key: K, value: SearchValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): Record<string, string> {
    const found: Record<string, string> = {};
    if (!values.origin) found.origin = "Choose an airport from the list";
    if (!values.destination) found.destination = "Choose an airport from the list";
    if (values.origin && values.origin === values.destination) {
      found.destination = "Destination must differ from origin";
    }
    if (!values.departureDate) found.departureDate = "Pick a departure date";
    else if (values.departureDate < todayLocal()) {
      found.departureDate = "Departure cannot be in the past";
    }
    if (roundTrip) {
      if (!values.returnDate) found.returnDate = "Pick a return date";
      else if (values.returnDate < values.departureDate) {
        found.returnDate = "Return must be on or after departure";
      }
    }
  const adults = Number(counts.adults);
  const children = counts.children.trim() === "" ? 0 : Number(counts.children);
  const infants = counts.infants.trim() === "" ? 0 : Number(counts.infants);

  if (counts.adults.trim() === "" || !Number.isInteger(adults) || adults < 1) {
    found.adults = "At least 1 adult is required";
  }
  if (!Number.isInteger(children) || children < 0) {
    found.children = "Enter a whole number, 0 or more";
  }
  if (!Number.isInteger(infants) || infants < 0) {
    found.infants = "Enter a whole number, 0 or more";
  } else if (infants > adults) {
    found.infants = "Each infant needs an adult";
  }
    return found;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSearch({
        ...values,
        adults: Number(counts.adults),
        children: counts.children.trim() === "" ? 0 : Number(counts.children),
        infants: counts.infants.trim() === "" ? 0 : Number(counts.infants),
        returnDate: roundTrip ? values.returnDate : "",
    });
  }

  return (
    <Card className="p-5 sm:p-6">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="flex gap-4 text-sm font-medium text-ink">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={!roundTrip}
              onChange={() => setRoundTrip(false)}
            />
            One way
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={roundTrip}
              onChange={() => setRoundTrip(true)}
            />
            Round trip
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <AirportPicker
            label="From"
            value={values.origin}
            onChange={(code) => set("origin", code)}
            error={errors.origin}
          />
          <AirportPicker
            label="To"
            value={values.destination}
            onChange={(code) => set("destination", code)}
            error={errors.destination}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
        <DateField
            label="Departure"
            min={todayLocal()}
            value={values.departureDate}
            onChange={(iso) => set("departureDate", iso)}
            error={errors.departureDate}
        />
        {roundTrip && (
            <DateField
            label="Return"
            min={values.departureDate || todayLocal()}
            value={values.returnDate}
            onChange={(iso) => set("returnDate", iso)}
            error={errors.returnDate}
            />
        )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
            label="Adults (12+)"
            type="number"
            min={1}
            value={counts.adults}
            onChange={(e) => setCount("adults", e.target.value)}
            onBlur={() => resetCount("adults")}
            error={errors.adults}
            />
            <Input
            label="Children (2-11)"
            type="number"
            min={0}
            value={counts.children}
            onChange={(e) => setCountClean("children", e.target.value)}
            onBlur={() => resetCount("children")}
            error={errors.children}
            />
            <Input
            label="Infants (under 2)"
            type="number"
            min={0}
            value={counts.infants}
            onChange={(e) => setCountClean("infants", e.target.value)}
            onBlur={() => resetCount("infants")}
            error={errors.infants}
            />
          <Select
            label="Cabin"
            placeholder="Any cabin"
            value={values.cabin}
            onChange={(e) => set("cabin", e.target.value as CabinClass | "")}
          >
            {CABINS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        <Button type="submit">Search flights</Button>
      </form>
    </Card>
  );
}