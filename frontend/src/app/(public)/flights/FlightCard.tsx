import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { formatDuration, localDate, localTime } from "./format";
import type { FlightResult } from "./types";

export function FlightCard({ flight }: { flight: FlightResult }) {
  return (
    <Link href={`/flights/${flight.id}`} className="block">
      <Card className="p-5 transition hover:border-brand-300">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-sm text-slate-500">
              {flight.airline.name} · {flight.flightNumber}
            </p>
            <div className="flex items-center gap-3 text-ink">
              <div>
                <p className="text-xl font-bold">
                  {localTime(flight.departureLocal)}
                </p>
                <p className="text-xs text-slate-500">
                  {flight.origin.iataCode} · {localDate(flight.departureLocal)}
                </p>
              </div>
              <div className="px-2 text-center text-xs text-slate-500">
                <p>{formatDuration(flight.durationMinutes)}</p>
                <p>→</p>
              </div>
              <div>
                <p className="text-xl font-bold">
                  {localTime(flight.arrivalLocal)}
                </p>
                <p className="text-xs text-slate-500">
                  {flight.destination.iataCode} · {localDate(flight.arrivalLocal)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {flight.cabins.map((c) => (
                <Badge key={c.cabin} variant="brand">
                  {c.cabin} · {c.seatsAvailable} left
                </Badge>
              ))}
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-2xl font-bold text-brand-700">
              {formatCurrency(flight.price)}
            </p>
            <p className="text-xs text-slate-500">per traveller</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}