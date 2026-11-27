"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { ArrowLeft, Building, Clock } from "@/components/ui/icons";
import { assetUrl } from "@/lib/api/client";
import { ApiError, getErrorMessages } from "@/lib/api/errors";
import { buttonClasses } from "@/lib/ui";
import { getCities, getCountries, getHotel, type CancellationTier, type Hotel } from "../_lib/api";
import { HotelReviews } from "./HotelReviews";
import { RoomPicker } from "./RoomPicker";

// "7 days before → 100%" in plain words, highest threshold first
function tierText(tiers: CancellationTier[]): string[] {
  const sorted = [...tiers].sort((a, b) => b.daysBefore - a.daysBefore);
  const lines = sorted.map(
    (t) =>
      `Cancel at least ${t.daysBefore} ${t.daysBefore === 1 ? "day" : "days"} before check-in: ${t.refundPercent}% refund`,
  );
  const lowest = sorted[sorted.length - 1];
  if (lowest && lowest.daysBefore > 0) {
    lines.push(`Later than that: no refund`);
  }
  return lines;
}

export function HotelDetailsClient() {
  const { id } = useParams<{ id: string }>();

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [place, setPlace] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [activePhoto, setActivePhoto] = useState(0);

  // Load the hotel, then turn "cairo" + "EG" into "Cairo, Egypt"
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getHotel(id)
      .then(async (h) => {
        if (cancelled) return;
        setHotel(h);
        setActivePhoto(0);
        try {
          const [countries, cities] = await Promise.all([getCountries(), getCities(h.countryCode)]);
          const city = cities.data.find((c) => c.cityId === h.cityId)?.name ?? h.cityId;
          const country = countries.data.find((c) => c.code === h.countryCode)?.name ?? h.countryCode;
          if (!cancelled) setPlace(`${city}, ${country}`);
        } catch {
          if (!cancelled) setPlace(h.cityId); // names are a nice-to-have
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  if (loading) return <FullPageSpinner label="Loading hotel…" />;

  // 400 (bad id) or 404 (not found / deactivated): friendly "not found"
  if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
    return (
      <EmptyState
        icon={<Building className="h-6 w-6" />}
        title="Hotel not found"
        description="This hotel doesn't exist or isn't available any more."
        action={
          <Link href="/hotels" className={buttonClasses("primary")}>
            Back to hotel search
          </Link>
        }
      />
    );
  }
  if (error || !hotel) {
    return (
      <ErrorState
        title="Couldn't load this hotel"
        messages={getErrorMessages(error)}
        onRetry={() => setReloadKey((k) => k + 1)}
      />
    );
  }

  const photos = hotel.photos;
  const policyLines = tierText(hotel.cancellationTiers);

  return (
    <div className="space-y-8">
      <Link href="/hotels" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-500">
        <ArrowLeft className="h-4 w-4" />
        Back to search
      </Link>

      {/* ---------- Header ---------- */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">{hotel.name}</h1>
          {hotel.starClass ? (
            <p className="text-amber-500" aria-label={`${hotel.starClass} star hotel`}>
              {"★".repeat(hotel.starClass)}
            </p>
          ) : null}
          <p className="text-sm text-slate-500">
            {hotel.address}
            {place && ` · ${place}`}
          </p>
        </div>
        <div className="text-sm sm:text-right">
          {hotel.ratingCount > 0 ? (
            <>
              <p className="text-2xl font-bold text-ink">
                {hotel.ratingAvg.toFixed(1)}
                <span className="text-base font-normal text-slate-500"> / 5</span>
              </p>
              <p className="text-slate-500">
                {hotel.ratingCount} {hotel.ratingCount === 1 ? "rating" : "ratings"}
              </p>
            </>
          ) : (
            <p className="text-slate-500">No ratings yet</p>
          )}
        </div>
      </header>

      {/* ---------- Photos (GEN-08 uploads) ---------- */}
      {photos.length > 0 ? (
        <div className="space-y-3">
          <div className="aspect-[16/7] max-w-full overflow-hidden rounded-2xl bg-brand-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl(photos[activePhoto])}
              alt={`${hotel.name}, photo ${activePhoto + 1} of ${photos.length}`}
              className="h-full w-full object-cover"
            />
          </div>
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((p, i) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setActivePhoto(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-pressed={i === activePhoto}
                  className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${
                    i === activePhoto ? "border-brand-600" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={assetUrl(p)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex aspect-[16/5] max-w-full items-center justify-center rounded-2xl bg-brand-50 text-brand-300">
          <Building className="h-12 w-12" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ---------- About + amenities ---------- */}
        <Card>
          <CardHeader>
            <CardTitle>About this hotel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {hotel.description || "The hotel hasn't added a description yet."}
            </p>
            {hotel.amenities.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-ink">Amenities</p>
                <div className="flex flex-wrap gap-1.5">
                  {hotel.amenities.map((a) => (
                    <Badge key={a} variant="brand">
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---------- Policies (HTL-09, HTL-10) ---------- */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Policies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="h-4 w-4" /> Check-in
                </p>
                <p className="font-semibold text-ink">{hotel.checkInTime ? `from ${hotel.checkInTime}` : "Not set"}</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="h-4 w-4" /> Check-out
                </p>
                <p className="font-semibold text-ink">{hotel.checkOutTime ? `until ${hotel.checkOutTime}` : "Not set"}</p>
              </div>
            </div>
            <div>
              <p className="mb-1 font-semibold text-ink">Cancellation</p>
              {policyLines.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-slate-600">
                  {policyLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-600">The hotel hasn&apos;t set a cancellation policy yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---------- Free rooms for the dates (HTL-15) ---------- */}
      <RoomPicker hotelId={hotel._id} />

      {/* ---------- Reviews (HTL-24) ---------- */}
      <HotelReviews hotelId={hotel._id} />
    </div>
  );
}