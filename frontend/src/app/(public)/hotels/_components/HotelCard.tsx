import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Building } from "@/components/ui/icons";
import { assetUrl } from "@/lib/api/client";
import { buttonClasses } from "@/lib/ui";
import { formatCurrency } from "@/lib/utils";
import type { HotelSearchResult } from "../_lib/api";

interface HotelCardProps {
  hotel: HotelSearchResult;
  href: string; // details link, keeps the searched dates
  place: string; // "Cairo, Egypt"
}

export function HotelCard({ hotel, href, place }: HotelCardProps) {
  const photo = hotel.photos[0];

  return (
    <article className="card-surface flex flex-col overflow-hidden sm:flex-row">
      {/* Photo (or a plain placeholder when the hotel has none) */}
      <div className="h-44 w-full shrink-0 bg-brand-50 sm:h-auto sm:w-56">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetUrl(photo)} alt={hotel.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-brand-300">
            <Building className="h-10 w-10" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-5 sm:flex-row sm:justify-between">
        {/* Left: name, stars, place, rating, amenities */}
        <div className="min-w-0 space-y-2">
          <div>
            <h2 className="text-lg font-semibold text-ink">{hotel.name}</h2>
            {hotel.starClass ? (
              <p className="text-sm text-amber-500" aria-label={`${hotel.starClass} star hotel`}>
                {"★".repeat(hotel.starClass)}
              </p>
            ) : null}
            <p className="text-sm text-slate-500">
              {hotel.address} · {place}
            </p>
          </div>

          <p className="text-sm">
            {hotel.ratingCount > 0 ? (
              <>
                <span className="font-semibold text-ink">{hotel.ratingAvg.toFixed(1)}</span>
                <span className="text-slate-500"> / 5 ({hotel.ratingCount} reviews)</span>
              </>
            ) : (
              <span className="text-slate-500">No reviews yet</span>
            )}
          </p>

          {hotel.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {hotel.amenities.slice(0, 4).map((a) => (
                <Badge key={a} variant="brand">
                  {a}
                </Badge>
              ))}
              {hotel.amenities.length > 4 && (
                <Badge>+{hotel.amenities.length - 4}</Badge>
              )}
            </div>
          )}
        </div>

        {/* Right: price for the stay + button */}
        <div className="flex shrink-0 flex-col gap-2 sm:items-end sm:text-right">
          <p className="text-xs text-slate-500">from</p>
          <p className="text-2xl font-bold text-ink">
            {formatCurrency(hotel.cheapestPricePerNight)}
            <span className="text-sm font-normal text-slate-500"> / night</span>
          </p>
          <p className="text-sm text-slate-500">
            {formatCurrency(hotel.cheapestPricePerNight * hotel.nights)} for {hotel.nights}{" "}
            {hotel.nights === 1 ? "night" : "nights"}
          </p>
          <p className="text-xs font-medium text-emerald-700">
            {hotel.freeRooms} {hotel.freeRooms === 1 ? "room" : "rooms"} available
          </p>
          <Link href={href} className={buttonClasses("primary", "md", "mt-1")}>
            View rooms
          </Link>
        </div>
      </div>
    </article>
  );
}