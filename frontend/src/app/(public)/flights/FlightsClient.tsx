"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Pagination } from "@/components/ui/Pagination";
import { FilterBar, type FilterValues } from "./FilterBar";
import { FlightCard } from "./FlightCard";
import { SearchForm, type SearchValues } from "./SearchForm";
import type { CabinClass, SearchResponse } from "./types";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; messages?: string[] }
  | { status: "done"; data: SearchResponse };

function toNumber(value: string | null, fallback: number): number {
  const n = Number(value);
  return value !== null && Number.isFinite(n) ? n : fallback;
}

export function FlightsClient() {
  const router = useRouter();
  const params = useSearchParams();
  const query = params.toString();

  const initial: SearchValues = {
    origin: params.get("origin") ?? "",
    destination: params.get("destination") ?? "",
    departureDate: params.get("departureDate") ?? "",
    returnDate: params.get("returnDate") ?? "",
    adults: toNumber(params.get("adults"), 1),
    children: toNumber(params.get("children"), 0),
    infants: toNumber(params.get("infants"), 0),
    cabin: (params.get("cabin") ?? "") as CabinClass | "",
  };
  const hasSearch = Boolean(
    initial.origin && initial.destination && initial.departureDate,
  );

  const filters: FilterValues = {
    sortBy: params.get("sortBy") ?? "price",
    order: params.get("order") ?? "asc",
    minPrice: params.get("minPrice") ?? "",
    maxPrice: params.get("maxPrice") ?? "",
  };
  const page = Math.max(1, toNumber(params.get("page"), 1));

  const [state, setState] = useState<State>({ status: "idle" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!hasSearch) {
      setState({ status: "idle" });
      return;
    }
    const controller = new AbortController();
    setState({ status: "loading" });
    api
      .get<SearchResponse>("/flights/search", {
        query: Object.fromEntries(new URLSearchParams(query)),
        signal: controller.signal,
      })
      .then((data) => setState({ status: "done", data }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          messages: err instanceof ApiError ? err.messages : undefined,
        });
      });
    return () => controller.abort();
  }, [query, hasSearch, reloadKey]);

  // change some URL params (an empty value removes the param)
  function pushWith(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.push(`/flights?${next.toString()}`);
  }

  // a new search keeps the chosen sort and price range but goes back to page 1
  function handleSearch(values: SearchValues) {
    const next = new URLSearchParams();
    next.set("origin", values.origin);
    next.set("destination", values.destination);
    next.set("departureDate", values.departureDate);
    if (values.returnDate) next.set("returnDate", values.returnDate);
    next.set("adults", String(values.adults));
    next.set("children", String(values.children));
    next.set("infants", String(values.infants));
    if (values.cabin) next.set("cabin", values.cabin);
    for (const key of ["sortBy", "order", "minPrice", "maxPrice"]) {
      const value = params.get(key);
      if (value) next.set(key, value);
    }
    router.push(`/flights?${next.toString()}`);
  }

  function handleFilters(next: FilterValues) {
    pushWith({ ...next, page: "" });
  }

  function handlePage(nextPage: number) {
    pushWith({ page: String(nextPage) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // remount the forms when the values in the URL change (back button, shared link)
  const formKey = Object.values(initial).join("|");
  const filterKey = `${filters.minPrice}|${filters.maxPrice}`;

  // one page number applies to both legs of a round trip
  const totalPages =
    state.status === "done"
      ? Math.max(
          state.data.outbound.totalPages,
          state.data.return?.totalPages ?? 0,
        )
      : 0;

  return (
    <div className="space-y-6">
      <SearchForm key={formKey} initial={initial} onSearch={handleSearch} />

      {hasSearch && (
        <FilterBar key={filterKey} values={filters} onChange={handleFilters} />
      )}

      {state.status === "idle" && (
        <EmptyState
          title="Search for flights"
          description="Choose where you are flying from and to, and your travel date."
        />
      )}

      {state.status === "loading" && (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {state.status === "error" && (
        <ErrorState
          title="Could not search flights"
          messages={state.messages}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      )}

      {state.status === "done" && (
        <div className="space-y-8">
          <section className="space-y-4">
            {state.data.tripType === "round-trip" && (
              <h2 className="text-lg font-semibold text-ink">Outbound</h2>
            )}
            {state.data.outbound.data.length === 0 ? (
              <EmptyState
                title="No flights found"
                description={state.data.message ?? "Try other dates or airports."}
              />
            ) : (
              state.data.outbound.data.map((f) => (
                <FlightCard key={f.id} flight={f} />
              ))
            )}
          </section>

          {state.data.return && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-ink">Return</h2>
              {state.data.return.data.length === 0 ? (
                <EmptyState
                  title="No return flights found"
                  description="Try other return dates."
                />
              ) : (
                state.data.return.data.map((f) => (
                  <FlightCard key={f.id} flight={f} />
                ))
              )}
            </section>
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={handlePage}
          />
        </div>
      )}
    </div>
  );
}