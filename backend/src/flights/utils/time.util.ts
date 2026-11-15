import { BadRequestException } from '@nestjs/common';

/** Local date-time WITHOUT offset, e.g. 2026-12-20T08:00 */
export const LOCAL_DT_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

function parts(date: Date, zone: string): Record<string, string> {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const p: Record<string, string> = {};
  for (const x of dtf.formatToParts(date)) p[x.type] = x.value;
  return p;
}

function offsetMs(date: Date, zone: string): number {
  const p = parts(date, zone);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** FLT-03: interpret `local` in the airport's IANA zone and return the UTC instant. */
export function localToUtc(local: string, zone: string): Date {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) throw new BadRequestException(`Invalid local date-time "${local}"`);
  const [y, mo, d, h, mi] = [m[1], m[2], m[3], m[4], m[5]].map(Number);
  const s = m[6] ? Number(m[6]) : 0;
  const naive = Date.UTC(y, mo - 1, d, h, mi, s);
  const chk = new Date(naive);
  if (
    chk.getUTCFullYear() !== y || chk.getUTCMonth() !== mo - 1 || chk.getUTCDate() !== d ||
    chk.getUTCHours() !== h || chk.getUTCMinutes() !== mi
  ) {
    throw new BadRequestException(`"${local}" is not a valid date-time`);
  }
  try {
    let guess = naive - offsetMs(new Date(naive), zone);
    guess = naive - offsetMs(new Date(guess), zone);
    return new Date(guess);
  } catch {
    throw new BadRequestException(`Unknown time zone ${zone}`);
  }
}

/** GEN-06: UTC instant -> local "yyyy-MM-ddTHH:mm" in the airport's zone. */
export function utcToLocal(date: Date, zone: string): string {
  const p = parts(date, zone);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Local calendar date at the airport (for the duplicate-flight rule). */
export const localDate = (date: Date, zone: string): string => utcToLocal(date, zone).slice(0, 10);
