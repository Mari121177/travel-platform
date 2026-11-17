// All dates are "YYYY-MM-DD" strings (UTC). Check-out is EXCLUSIVE.
const DAY_MS = 86_400_000;

export function isValidDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS,
  );
}

/** Nights occupied by a stay: checkIn .. checkOut-1 */
export function nightsBetween(checkIn: string, checkOut: string): string[] {
  const count = diffDays(checkIn, checkOut);
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const nights: string[] = [];
  for (let i = 0; i < count; i++) {
    nights.push(new Date(start + i * DAY_MS).toISOString().slice(0, 10));
  }
  return nights;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
