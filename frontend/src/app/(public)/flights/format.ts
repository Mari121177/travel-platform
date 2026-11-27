// Times come as "2026-12-20T10:00:00+02:00" in the airport's own local time (GEN-06).
// Slice the string instead of using new Date(), which would convert to the browser's zone.
export function localTime(iso: string): string {
  return iso.slice(11, 16);
}

export function localDate(iso: string): string {
  return iso.slice(0, 10);
}

export function formatDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}