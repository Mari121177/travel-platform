"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Calendar } from "@/components/ui/icons";
import { getErrorMessages } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/AuthProvider";
import { buttonClasses } from "@/lib/ui";
import { formatCurrency } from "@/lib/utils";
import { bookingLink, getAvailableRooms, type AvailableRoomsResponse } from "../_lib/api";

const MAX_ROOMS = 10; // the booking backend allows up to 10 rooms

function today(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function RoomPicker({ hotelId }: { hotelId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Dates come from the URL (the search page passes them along)
  const urlCheckIn = searchParams.get("checkIn") ?? "";
  const urlCheckOut = searchParams.get("checkOut") ?? "";
  const urlGuests = searchParams.get("guests") ?? "2";

  const [checkIn, setCheckIn] = useState(urlCheckIn);
  const [checkOut, setCheckOut] = useState(urlCheckOut);
  const [guests, setGuests] = useState(urlGuests);
  const [formError, setFormError] = useState<{ checkIn?: string; checkOut?: string; guests?: string }>({});

  const [result, setResult] = useState<AvailableRoomsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);

  // Keep the inputs in sync with the URL (back/forward buttons)
  useEffect(() => {
    setCheckIn(urlCheckIn);
    setCheckOut(urlCheckOut);
    setGuests(urlGuests);
  }, [urlCheckIn, urlCheckOut, urlGuests]);

  // Load the free rooms whenever the URL has both dates
  useEffect(() => {
    setSelected([]);
    if (!urlCheckIn || !urlCheckOut) {
      setResult(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAvailableRooms(hotelId, urlCheckIn, urlCheckOut)
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
  }, [hotelId, urlCheckIn, urlCheckOut, reloadKey]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: typeof formError = {};
    if (!checkIn) errs.checkIn = "Choose a check-in date.";
    else if (checkIn < today()) errs.checkIn = "Check-in can't be in the past.";
    if (!checkOut) errs.checkOut = "Choose a check-out date.";
    else if (checkIn && checkOut <= checkIn) errs.checkOut = "Check-out must be after check-in.";
    if (!Number.isInteger(Number(guests)) || Number(guests) < 1) errs.guests = "At least 1 guest.";
    setFormError(errs);
    if (Object.keys(errs).length > 0) return;

    const p = new URLSearchParams(searchParams.toString());
    p.set("checkIn", checkIn);
    p.set("checkOut", checkOut);
    p.set("guests", guests);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  function toggle(roomId: string) {
    setSelected((s) =>
      s.includes(roomId) ? s.filter((x) => x !== roomId) : s.length < MAX_ROOMS ? [...s, roomId] : s,
    );
  }

  // Totals for the selected rooms
  const rooms = result?.rooms ?? [];
  const chosen = rooms.filter((r) => selected.includes(r.roomId));
  const total = chosen.reduce((sum, r) => sum + r.totalPrice, 0);
  const capacity = chosen.reduce((sum, r) => sum + r.maxOccupancy, 0);
  const guestCount = Number(urlGuests) || 1;
  const tooSmall = chosen.length > 0 && capacity < guestCount;

  // Only travelers book; moderators and admins get a 403 from the backend
  const canBook = !user || user.role === "user";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available rooms</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Dates */}
        <form onSubmit={onSubmit} noValidate className="grid gap-3 sm:grid-cols-[1fr_1fr_120px_auto] sm:items-start">
          <Input
            label="Check-in"
            type="date"
            min={today()}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            error={formError.checkIn}
          />
          <Input
            label="Check-out"
            type="date"
            min={checkIn ? nextDay(checkIn) : nextDay(today())}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            error={formError.checkOut}
          />
          <Input
            label="Guests"
            type="number"
            min={1}
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            error={formError.guests}
          />
          <Button type="submit" variant="secondary" className="sm:mt-[1.625rem]">
            Check availability
          </Button>
        </form>

        {/* Rooms */}
        {!urlCheckIn || !urlCheckOut ? (
          <EmptyState
            icon={<Calendar className="h-6 w-6" />}
            title="Choose your dates"
            description="Pick check-in and check-out dates to see which rooms are free and the total price."
          />
        ) : loading ? (
          <div className="space-y-3">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : error ? (
          <ErrorState title="Couldn't load rooms" messages={error} onRetry={() => setReloadKey((k) => k + 1)} />
        ) : rooms.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-6 w-6" />}
            title="No rooms free for these dates"
            description="Every room is taken or closed on at least one of these nights. Try other dates."
          />
        ) : (
          <>
            <p className="text-sm text-slate-500">
              {result?.nights} {result?.nights === 1 ? "night" : "nights"} · select one or more rooms (up to {MAX_ROOMS})
            </p>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
              {rooms.map((room) => {
                const isChosen = selected.includes(room.roomId);
                return (
                  <li key={room.roomId}>
                    <label
                      className={`flex cursor-pointer flex-wrap items-center gap-4 p-4 transition ${
                        isChosen ? "bg-brand-50" : "bg-white hover:bg-brand-50/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChosen}
                        onChange={() => toggle(room.roomId)}
                        disabled={!isChosen && selected.length >= MAX_ROOMS}
                        className="h-5 w-5 accent-brand-600"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink">
                          {room.type} room <span className="font-normal text-slate-500">· No. {room.roomNumber}</span>
                        </p>
                        <p className="text-sm text-slate-500">
                          {room.beds} {room.beds === 1 ? "bed" : "beds"} · up to {room.maxOccupancy}{" "}
                          {room.maxOccupancy === 1 ? "guest" : "guests"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-ink">{formatCurrency(room.totalPrice)}</p>
                        <p className="text-xs text-slate-500">{formatCurrency(room.pricePerNight)} / night</p>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>

            {/* Summary + Book (link agreed with Maya) */}
            <div className="flex flex-col gap-3 rounded-xl bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                {chosen.length === 0 ? (
                  <p className="text-slate-600">Select the rooms you want to book.</p>
                ) : (
                  <>
                    <p className="font-semibold text-ink">
                      {chosen.length} {chosen.length === 1 ? "room" : "rooms"} · {formatCurrency(total)} total
                    </p>
                    <p className={tooSmall ? "font-medium text-red-600" : "text-slate-600"}>
                      Fits up to {capacity} {capacity === 1 ? "guest" : "guests"}
                      {tooSmall && ` - not enough for ${guestCount} guests, add a room`}
                    </p>
                  </>
                )}
              </div>
              {canBook ? (
                chosen.length > 0 && !tooSmall ? (
                  <Link
                    href={bookingLink({
                      hotelId,
                      roomIds: selected,
                      checkIn: urlCheckIn,
                      checkOut: urlCheckOut,
                      guests: guestCount,
                    })}
                    className={buttonClasses("primary", "lg")}
                  >
                    Book {chosen.length === 1 ? "this room" : "these rooms"}
                  </Link>
                ) : (
                  <Button size="lg" disabled>
                    Book
                  </Button>
                )
              ) : (
                <p className="text-sm text-slate-600">Only traveler accounts can book rooms.</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}