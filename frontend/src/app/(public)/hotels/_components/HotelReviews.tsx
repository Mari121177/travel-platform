"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Pagination } from "@/components/ui/Pagination";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { getErrorMessages } from "@/lib/api/errors";
import { formatDate } from "@/lib/utils";
import { getHotelReviews, type HotelReviewsResponse } from "../_lib/api";

// HTL-24: average rating, number of ratings, reviews newest first (paginated)
export function HotelReviews({ hotelId }: { hotelId: string }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<HotelReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getHotelReviews(hotelId, page)
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
  }, [hotelId, page, reloadKey]);

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Guest reviews</CardTitle>
        {result && result.ratingCount > 0 && (
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-ink">{result.ratingAvg.toFixed(1)} / 5</span> from{" "}
            {result.ratingCount} {result.ratingCount === 1 ? "rating" : "ratings"}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <CardSkeleton />
        ) : error ? (
          <ErrorState title="Couldn't load reviews" messages={error} onRetry={() => setReloadKey((k) => k + 1)} />
        ) : !result || result.data.length === 0 ? (
          <EmptyState title="No reviews yet" description="Guests can review this hotel after a completed stay." />
        ) : (
          <>
            <ul className="space-y-4">
              {result.data.map((r) => (
                <li key={r._id} className="border-b border-line pb-4 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-ink">{r.author?.name ?? "Guest"}</p>
                    <p className="text-xs text-slate-500">{formatDate(r.createdAt)}</p>
                  </div>
                  <p className="text-sm text-amber-500" aria-label={`${r.rating} out of 5`}>
                    {"★".repeat(r.rating)}
                    <span className="text-slate-300">{"★".repeat(5 - r.rating)}</span>
                  </p>
                  {r.comment && <p className="mt-1 text-sm text-slate-600">{r.comment}</p>}
                  {r.reply && (
                    <div className="mt-3 rounded-lg bg-brand-50 p-3 text-sm">
                      <p className="font-semibold text-ink">Reply from the hotel</p>
                      <p className="text-slate-600">{r.reply}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
          </>
        )}
      </CardContent>
    </Card>
  );
}