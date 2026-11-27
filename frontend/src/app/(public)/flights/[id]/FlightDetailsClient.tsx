"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatCurrency } from "@/lib/utils";
import { formatDuration, localDate, localTime } from "../format";
import type { FlightDetails } from "../types";

type State =
  | { status: "loading" }
  | { status: "notfound" }
  | { status: "error"; messages?: string[] }
  | { status: "done"; flight: FlightDetails };

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  Scheduled: "success",
  Cancelled: "danger",
  Departed: "neutral",
};

function BackLink() {
  const router = useRouter();

  // go back to the exact results page (search, sort and filters live in the URL);
  // if the page was opened directly, there is no history, so go to a fresh search
  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/flights");
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="text-sm font-medium text-brand-700 hover:underline"
    >
      ← Back to results
    </button>
  );
}

export function FlightDetailsClient() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<State>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    api
      .get<FlightDetails>(`/flights/${encodeURIComponent(id)}`, {
        signal: controller.signal,
      })
      .then((flight) => setState({ status: "done", flight }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
          setState({ status: "notfound" });
          return;
        }
        setState({
          status: "error",
          messages: err instanceof ApiError ? err.messages : undefined,
        });
      });
    return () => controller.abort();
  }, [id, reloadKey]);

  if (state.status === "loading") {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (state.status === "notfound") {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState
          title="Flight not found"
          description="This flight does not exist or is no longer available."
        />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorState
          title="Could not load this flight"
          messages={state.messages}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      </div>
    );
  }

  const f = state.flight;
  const tiers = [...f.cancellationPolicy].sort(
    (a, b) => b.daysBeforeDeparture - a.daysBeforeDeparture,
  );
  const canBuyBags =
    f.extraBaggage.pricePerBag !== undefined && f.extraBaggage.maxExtraBags > 0;

  return (
    <div className="space-y-6">
      <BackLink />

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">
              {f.airline.name} ({f.airline.code})
            </p>
            <h1 className="text-2xl font-bold text-ink">
              Flight {f.flightNumber}
            </h1>
          </div>
          <Badge variant={STATUS_VARIANTS[f.status] ?? "neutral"}>
            {f.status}
          </Badge>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div>
            <p className="text-3xl font-bold text-ink">
              {localTime(f.departureLocal)}
            </p>
            <p className="text-sm text-slate-700">
              {f.origin.iataCode} · {f.origin.name}
            </p>
            <p className="text-xs text-slate-500">
              {localDate(f.departureLocal)} (local time, {f.origin.timeZone})
            </p>
          </div>
          <div className="text-center text-sm text-slate-500">
            <p className="font-medium text-ink">
              {formatDuration(f.durationMinutes)}
            </p>
            <p>→</p>
          </div>
          <div className="sm:text-right">
            <p className="text-3xl font-bold text-ink">
              {localTime(f.arrivalLocal)}
            </p>
            <p className="text-sm text-slate-700">
              {f.destination.iataCode} · {f.destination.name}
            </p>
            <p className="text-xs text-slate-500">
              {localDate(f.arrivalLocal)} (local time, {f.destination.timeZone})
            </p>
          </div>
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Cabins</h2>
        {f.cabins.length === 0 ? (
          <EmptyState
            title="No cabins available"
            description="This flight has no bookable cabins yet."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {f.cabins.map((c) => (
              <Card key={c.cabin} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-ink">{c.cabin}</h3>
                  {c.seatsRemaining === 0 && (
                    <Badge variant="danger">Sold out</Badge>
                  )}
                </div>
                <p className="mt-2 text-2xl font-bold text-brand-700">
                  {formatCurrency(c.price)}
                </p>
                <p className="text-xs text-slate-500">per adult or child</p>
                <ul className="mt-3 space-y-1 text-sm text-slate-700">
                  <li>{c.seatsRemaining} seats left</li>
                  <li>
                    {c.freeBags} free {c.freeBags === 1 ? "bag" : "bags"}, up to{" "}
                    {c.maxBagWeightKg} kg each
                  </li>
                </ul>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-ink">Extra baggage</h2>
          <p className="mt-2 text-sm text-slate-700">
            {canBuyBags
              ? `${formatCurrency(f.extraBaggage.pricePerBag as number)} per extra bag, up to ${f.extraBaggage.maxExtraBags} extra ${f.extraBaggage.maxExtraBags === 1 ? "bag" : "bags"} per passenger.`
              : "Extra bags are not offered on this flight."}
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold text-ink">Cancellation policy</h2>
          {tiers.length === 0 ? (
            <p className="mt-2 text-sm text-slate-700">
              This airline has not published a cancellation policy.
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {tiers.map((t) => (
                <li key={t.daysBeforeDeparture}>
                  {t.daysBeforeDeparture}+ days before departure:{" "}
                  <span className="font-semibold">{t.refundPercent}% refund</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}