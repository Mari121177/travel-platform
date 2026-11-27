"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Building, Search } from "@/components/ui/icons";
import { getErrorMessages } from "@/lib/api/errors";
import type { ReferenceCity, ReferenceCountry } from "@/lib/types";
import {
  getCities,
  getCountries,
  searchHotels,
  type HotelSearchParams,
  type HotelSearchResponse,
} from "../_lib/api";
import { HotelCard } from "./HotelCard";

// Everything in the form is kept as text, exactly like the inputs hold it
interface SearchForm {
  destination: string; // what the user typed, e.g. "Cairo, Egypt"
  countryCode: string;
  cityId: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  rooms: string;
  minPrice: string;
  maxPrice: string;
  minRating: string;
  sort: string; // "price-asc" | "price-desc" | "rating-desc"
}

type FieldErrors = Partial<Record<keyof SearchForm, string>>;

// One choice in the destination box: a city, or a whole country
interface Destination {
  label: string; // "Cairo, Egypt" or "Egypt (all cities)"
  cityId: string;
  countryCode: string;
}

// Today as YYYY-MM-DD in the user's own time zone
function today(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

// The day after a YYYY-MM-DD date (check-out must be at least 1 night later)
function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// URL (?cityId=cairo&checkIn=...) -> form values
function formFromUrl(p: URLSearchParams): SearchForm {
  const sortBy = p.get("sortBy") ?? "price";
  const order = p.get("order") ?? (sortBy === "rating" ? "desc" : "asc");
  return {
    destination: "", // filled in once the city/country names are loaded
    countryCode: p.get("countryCode") ?? "",
    cityId: p.get("cityId") ?? "",
    checkIn: p.get("checkIn") ?? "",
    checkOut: p.get("checkOut") ?? "",
    guests: p.get("guests") ?? "2",
    rooms: p.get("rooms") ?? "1",
    minPrice: p.get("minPrice") ?? "",
    maxPrice: p.get("maxPrice") ?? "",
    minRating: p.get("minRating") ?? "",
    sort: `${sortBy}-${order}`,
  };
}

// Form values -> URL query (empty fields are left out)
function urlFromForm(f: SearchForm, page: number): string {
  const [sortBy, order] = f.sort.split("-");
  const entries: Record<string, string> = {
    countryCode: f.countryCode,
    cityId: f.cityId,
    checkIn: f.checkIn,
    checkOut: f.checkOut,
    guests: f.guests,
    rooms: f.rooms,
    minPrice: f.minPrice,
    maxPrice: f.maxPrice,
    minRating: f.minRating,
    sortBy,
    order,
    page: String(page),
  };
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) {
    if (value) q.set(key, value);
  }
  return q.toString();
}

// URL -> API params (numbers converted, missing filters left out)
function apiParamsFromUrl(p: URLSearchParams): HotelSearchParams {
  const num = (key: string) => (p.get(key) ? Number(p.get(key)) : undefined);
  return {
    countryCode: p.get("countryCode") ?? undefined,
    cityId: p.get("cityId") ?? undefined,
    checkIn: p.get("checkIn") ?? "",
    checkOut: p.get("checkOut") ?? "",
    guests: num("guests") ?? 1,
    rooms: num("rooms"),
    minPrice: num("minPrice"),
    maxPrice: num("maxPrice"),
    minRating: num("minRating"),
    sortBy: (p.get("sortBy") as "price" | "rating" | null) ?? undefined,
    order: (p.get("order") as "asc" | "desc" | null) ?? undefined,
    page: num("page"),
  };
}

// Same rules as the backend, checked before sending (UX only, GEN-13)
function validate(f: SearchForm): FieldErrors {
  const e: FieldErrors = {};
  if (!f.countryCode && !f.cityId) {
    e.destination = f.destination
      ? "Pick a destination from the suggestions."
      : "Type a city or a country.";
  }
  if (!f.checkIn) e.checkIn = "Choose a check-in date.";
  else if (f.checkIn < today()) e.checkIn = "Check-in can't be in the past.";
  if (!f.checkOut) e.checkOut = "Choose a check-out date.";
  else if (f.checkIn && f.checkOut <= f.checkIn) e.checkOut = "Check-out must be after check-in.";

  const guests = Number(f.guests);
  const rooms = Number(f.rooms);
  if (!Number.isInteger(guests) || guests < 1) e.guests = "At least 1 guest.";
  if (!Number.isInteger(rooms) || rooms < 1 || rooms > 10) e.rooms = "Between 1 and 10 rooms.";
  else if (!e.guests && rooms > guests) e.rooms = "Rooms can't be more than guests.";

  if (f.minPrice && Number(f.minPrice) < 0) e.minPrice = "Can't be negative.";
  if (f.maxPrice && Number(f.maxPrice) < 0) e.maxPrice = "Can't be negative.";
  if (f.minPrice && f.maxPrice && Number(f.minPrice) > Number(f.maxPrice)) {
    e.maxPrice = "Max price must be at least the min price.";
  }
  return e;
}

export function HotelSearchClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  const [form, setForm] = useState<SearchForm>(() => formFromUrl(new URLSearchParams(queryString)));
  const [errors, setErrors] = useState<FieldErrors>({});

  const [countries, setCountries] = useState<ReferenceCountry[]>([]);
  const [cities, setCities] = useState<ReferenceCity[]>([]);
  const [referenceError, setReferenceError] = useState(false);

  const [result, setResult] = useState<HotelSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // 1. Countries and cities for the dropdowns (GEN-12 reference data)
  useEffect(() => {
    Promise.all([getCountries(), getCities()])
      .then(([c, ci]) => {
        setCountries(c.data);
        setCities(ci.data);
      })
      .catch(() => setReferenceError(true));
  }, []);

  // 2. Keep the form in sync when the URL changes (back/forward buttons)
  useEffect(() => {
    setForm(formFromUrl(new URLSearchParams(queryString)));
  }, [queryString]);

  // 3. Run the search whenever the URL has a search in it
  useEffect(() => {
    const p = new URLSearchParams(queryString);
    if (!p.get("checkIn") || !p.get("checkOut")) {
      setResult(null);
      return;
    }
    let cancelled = false; // ignore old answers if the user searches again quickly
    setLoading(true);
    setError(null);
    searchHotels(apiParamsFromUrl(p))
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessages(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queryString, reloadKey]);

  // Every city ("Cairo, Egypt") and every country ("Egypt (all cities)")
  const destinations = useMemo<Destination[]>(() => {
    const countryName = (code: string) => countries.find((c) => c.code === code)?.name ?? code;
    return [
      ...cities.map((c) => ({
        label: `${c.name}, ${countryName(c.countryCode)}`,
        cityId: c.cityId,
        countryCode: "",
      })),
      ...countries.map((c) => ({ label: `${c.name} (all cities)`, cityId: "", countryCode: c.code })),
    ];
  }, [cities, countries]);

  // 4. Show the chosen city/country in the box (after a search or a page reload)
  useEffect(() => {
    setForm((f) => {
      if (f.destination) return f;
      const match = destinations.find(
        (d) => (f.cityId && d.cityId === f.cityId) || (!f.cityId && f.countryCode && d.countryCode === f.countryCode),
      );
      return match ? { ...f, destination: match.label } : f;
    });
  }, [destinations, queryString]);

  // "cairo" -> "Cairo, Egypt" for the result cards
  function placeName(cityId: string, countryCode: string): string {
    const city = cities.find((c) => c.cityId === cityId)?.name ?? cityId;
    const country = countries.find((c) => c.code === countryCode)?.name ?? countryCode;
    return `${city}, ${country}`;
  }

  function update<K extends keyof SearchForm>(key: K, value: SearchForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  // Typing in the destination box: when the text matches a suggestion,
  // remember its cityId or countryCode (that's what the API needs)
  function onDestinationChange(text: string) {
    const match = destinations.find((d) => d.label.toLowerCase() === text.trim().toLowerCase());
    setForm((f) => ({
      ...f,
      destination: text,
      cityId: match?.cityId ?? "",
      countryCode: match?.countryCode ?? "",
    }));
    setErrors((e) => ({ ...e, destination: undefined }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    router.push(`${pathname}?${urlFromForm(form, 1)}`);
  }

  // Sorting re-runs the current search straight away
  function onSortChange(sort: string) {
    const next = { ...form, sort };
    setForm(next);
    if (result) router.push(`${pathname}?${urlFromForm(next, 1)}`);
  }

  function onPageChange(page: number) {
    const p = new URLSearchParams(queryString);
    p.set("page", String(page));
    router.push(`${pathname}?${p.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // The details link keeps the dates, so the hotel page shows the free rooms
  function detailsHref(hotelId: string): string {
    const p = new URLSearchParams(queryString);
    const keep = new URLSearchParams();
    for (const key of ["checkIn", "checkOut", "guests", "rooms"]) {
      const v = p.get(key);
      if (v) keep.set(key, v);
    }
    return `/hotels/${hotelId}?${keep.toString()}`;
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* ---------- Search form ---------- */}
      <form onSubmit={onSubmit} noValidate className="card-surface h-fit space-y-4 p-5 lg:sticky lg:top-24">
        <Input
          label="Destination"
          placeholder="City or country, e.g. Cairo"
          list="hotel-destinations"
          autoComplete="off"
          value={form.destination}
          onChange={(e) => onDestinationChange(e.target.value)}
          error={errors.destination ?? (referenceError ? "Couldn't load destinations. Refresh the page." : null)}
        />
        {/* The browser shows these as suggestions while the user types */}
        <datalist id="hotel-destinations">
          {destinations.map((d) => (
            <option key={d.label} value={d.label} />
          ))}
        </datalist>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Check-in"
            type="date"
            min={today()}
            value={form.checkIn}
            onChange={(e) => update("checkIn", e.target.value)}
            error={errors.checkIn}
          />
          <Input
            label="Check-out"
            type="date"
            min={form.checkIn ? nextDay(form.checkIn) : nextDay(today())}
            value={form.checkOut}
            onChange={(e) => update("checkOut", e.target.value)}
            error={errors.checkOut}
          />
          <Input
            label="Guests"
            type="number"
            min={1}
            value={form.guests}
            onChange={(e) => update("guests", e.target.value)}
            error={errors.guests}
          />
          <Input
            label="Rooms"
            type="number"
            min={1}
            max={10}
            value={form.rooms}
            onChange={(e) => update("rooms", e.target.value)}
            error={errors.rooms}
          />
        </div>

        <fieldset className="space-y-3 border-t border-line pt-4">
          <legend className="sr-only">Filters</legend>
          <p className="text-sm font-semibold text-ink">Filters</p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Min price / night"
              type="number"
              min={0}
              optional
              value={form.minPrice}
              onChange={(e) => update("minPrice", e.target.value)}
              error={errors.minPrice}
            />
            <Input
              label="Max price / night"
              type="number"
              min={0}
              optional
              value={form.maxPrice}
              onChange={(e) => update("maxPrice", e.target.value)}
              error={errors.maxPrice}
            />
          </div>
          <Select
            label="Guest rating"
            value={form.minRating}
            onChange={(e) => update("minRating", e.target.value)}
            hint="Hotels without reviews are hidden when a rating is chosen."
          >
            <option value="">Any rating</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="4.5">4.5+</option>
          </Select>
        </fieldset>

        <Button type="submit" fullWidth loading={loading}>
          <Search className="h-4 w-4" />
          Search hotels
        </Button>
      </form>

      {/* ---------- Results ---------- */}
      <section className="min-w-0 space-y-4" aria-live="polite">
        {result && !loading && !error && result.total > 0 && (
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-ink">{result.total}</span>{" "}
              {result.total === 1 ? "hotel" : "hotels"} found
            </p>
            <Select
              aria-label="Sort by"
              containerClassName="sm:w-56"
              value={form.sort}
              onChange={(e) => onSortChange(e.target.value)}
            >
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="rating-desc">Rating: best first</option>
            </Select>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : error ? (
          <ErrorState
            title="Search failed"
            messages={error}
            onRetry={() => setReloadKey((k) => k + 1)}
          />
        ) : !result ? (
          <EmptyState
            icon={<Building className="h-6 w-6" />}
            title="Where are you going?"
            description="Choose a city or country, your dates and the number of guests to see available hotels."
          />
        ) : result.total === 0 ? (
          <EmptyState
            icon={<Building className="h-6 w-6" />}
            title="No hotels found"
            description="No hotel has enough free rooms for these dates. Try other dates, fewer rooms, or remove some filters."
          />
        ) : (
          <>
            {result.data.map((hotel) => (
              <HotelCard
                key={hotel.hotelId}
                hotel={hotel}
                href={detailsHref(hotel.hotelId)}
                place={placeName(hotel.cityId, hotel.countryCode)}
              />
            ))}
            {totalPages > 1 && (
              <Pagination page={result.page} totalPages={totalPages} onPageChange={onPageChange} />
            )}
          </>
        )}
      </section>
    </div>
  );
}