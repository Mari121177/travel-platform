import { INFANT_FARE_RATE } from './search.constants';
import type { SortField, SortOrder } from './search.constants';

export interface PassengerCounts {
  adults: number;
  children: number;
  infants: number;
}

// Offset of a time zone from UTC at a given instant, in milliseconds
// (Africa/Cairo in winter gives +2h). Uses the built-in Intl, so no library.
export function timeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(utcMs));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  const asIfUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  // Drop milliseconds, which Intl does not report
  return asIfUtc - Math.floor(utcMs / 1000) * 1000;
}

// The UTC instant at which a local date starts (00:00) in a time zone
function startOfLocalDayUtc(
  year: number,
  month: number,
  day: number,
  timeZone: string,
): number {
  const guess = Date.UTC(year, month - 1, day);
  const first = guess - timeZoneOffsetMs(guess, timeZone);
  // The offset can differ at the real instant (daylight saving), so check once more
  return guess - timeZoneOffsetMs(first, timeZone);
}

// FLT-11: the departure date is the LOCAL date at the departure airport, while
// flights are stored in UTC (FLT-03). Returns [start, end) in UTC for that day.
export function localDateToUtcRange(
  date: string,
  timeZone: string,
): { start: Date; end: Date } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new Error(`Invalid date "${date}", expected YYYY-MM-DD`);
  }
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return {
    start: new Date(startOfLocalDayUtc(year, month, day, timeZone)),
    end: new Date(
      startOfLocalDayUtc(
        next.getUTCFullYear(),
        next.getUTCMonth() + 1,
        next.getUTCDate(),
        timeZone,
      ),
    ),
  };
}

// FLT-11 / FLT-12: adults and children take a seat, infants do not
export function seatsNeeded(p: PassengerCounts): number {
  return p.adults + p.children;
}

// Rounds to 2 decimals, avoiding floating point noise such as 0.1 * 3
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// FLT-12: an infant pays 10% of the cabin fare
export function infantFare(cabinFare: number): number {
  return round2(cabinFare * INFANT_FARE_RATE);
}

// FLT-12: total for a party in one cabin (adults and children pay the full fare)
export function totalFare(cabinFare: number, p: PassengerCounts): number {
  return round2(seatsNeeded(p) * cabinFare + p.infants * infantFare(cabinFare));
}

// FLT-12 / FLT-15 / FLT-11: business rules that a DTO cannot express because
// they compare fields. Returns messages (empty list means valid).
export function validateSearchCriteria(c: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  minPrice?: number;
  maxPrice?: number;
}): string[] {
  const errors: string[] = [];
  if (c.origin === c.destination) {
    errors.push('origin and destination must be different airports');
  }
  if (c.adults < 1) {
    errors.push('at least one adult is required');
  }
  if (c.infants > c.adults) {
    errors.push('infants cannot outnumber adults');
  }
  // YYYY-MM-DD strings compare correctly as text
  if (c.returnDate && c.returnDate < c.departureDate) {
    errors.push('returnDate cannot be before departureDate');
  }
  if (
    c.minPrice !== undefined &&
    c.maxPrice !== undefined &&
    c.minPrice > c.maxPrice
  ) {
    errors.push('minPrice cannot be greater than maxPrice');
  }
  return errors;
}

// FLT-15: duration in minutes, computed in UTC so airport time zones do not matter
export function durationMinutes(departureUtc: Date, arrivalUtc: Date): number {
  return Math.round((arrivalUtc.getTime() - departureUtc.getTime()) / 60000);
}

// FLT-15: sorts by price, duration or departure time. Returns a new array.
export function sortResults<
  T extends { price: number; durationMinutes: number; departureTime: Date },
>(items: T[], sortBy: SortField, order: SortOrder = 'asc'): T[] {
  const value = (item: T): number =>
    sortBy === 'price'
      ? item.price
      : sortBy === 'duration'
        ? item.durationMinutes
        : item.departureTime.getTime();
  const direction = order === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => (value(a) - value(b)) * direction);
}