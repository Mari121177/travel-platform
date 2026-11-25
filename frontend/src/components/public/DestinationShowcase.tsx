"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ArrowRight, Globe } from "@/components/ui/icons";
import { api } from "@/lib/api/client";
import { getErrorMessages } from "@/lib/api/errors";
import type {
  ListResponse,
  ReferenceCity,
  ReferenceCountry,
} from "@/lib/types";

export function DestinationShowcase() {
  const [countries, setCountries] = useState<ReferenceCountry[]>([]);
  const [cities, setCities] = useState<ReferenceCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setErrors([]);
      try {
        const [countryResponse, cityResponse] = await Promise.all([
          api.get<ListResponse<ReferenceCountry>>("/reference/countries"),
          api.get<ListResponse<ReferenceCity>>("/reference/cities"),
        ]);
        if (cancelled) return;
        setCountries(countryResponse.data);
        setCities(cityResponse.data);
      } catch (error) {
        if (!cancelled) setErrors(getErrorMessages(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const citiesByCountry = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const city of cities) {
      const list = map.get(city.countryCode) ?? [];
      list.push(city.name);
      map.set(city.countryCode, list);
    }
    return map;
  }, [cities]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            Where to next?
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            Popular destinations
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Start with one of the destinations already in the platform.
          </p>
        </div>
        <Link
          href="/hotels"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition hover:text-brand-800"
        >
          Explore all hotels
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="card-surface space-y-3 p-5">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : errors.length > 0 ? (
          <ErrorState
            title="Destinations are unavailable"
            messages={errors}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        ) : countries.length === 0 ? (
          <EmptyState
            title="No destinations yet"
            description="Destinations will appear here once the reference data is available."
            icon={<Globe className="h-6 w-6" />}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {countries.map((country) => {
              const cityNames = citiesByCountry.get(country.code) ?? [];
              return (
                <Link
                  key={country.code}
                  href={`/hotels?country=${encodeURIComponent(country.code)}`}
                  className="group card-surface flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-pop"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-ink">
                        {country.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        {country.code}
                      </p>
                    </div>
                    <Badge variant="brand">{country.currency}</Badge>
                  </div>
                  <p className="mt-4 flex-1 text-sm text-slate-500">
                    {cityNames.length > 0
                      ? cityNames.join(" · ")
                      : "Cities coming soon"}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                    Find hotels
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
