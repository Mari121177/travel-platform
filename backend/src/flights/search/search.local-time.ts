import { timeZoneOffsetMs } from './search.utils';

// GEN-06: flights are stored in UTC, but users must see each airport's LOCAL
// time. Turns a UTC instant into an ISO string in the airport's IANA time
// zone, with the offset included so that no information is lost,
// e.g. 2026-01-15T08:00Z in Africa/Cairo gives "2026-01-15T10:00:00+02:00".
export function formatLocalIso(date: Date, timeZone: string): string {
  const offsetMs = timeZoneOffsetMs(date.getTime(), timeZone);
  const local = new Date(date.getTime() + offsetMs).toISOString().slice(0, 19);

  const sign = offsetMs < 0 ? '-' : '+';
  const totalMinutes = Math.round(Math.abs(offsetMs) / 60000);
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const mm = String(totalMinutes % 60).padStart(2, '0');
  return `${local}${sign}${hh}:${mm}`;
}