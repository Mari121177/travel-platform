import { formatLocalIso } from './search.local-time';

describe('formatLocalIso (GEN-06)', () => {
  it('Cairo winter (+02:00)', () => {
    expect(
      formatLocalIso(new Date('2026-01-15T08:00:00Z'), 'Africa/Cairo'),
    ).toBe('2026-01-15T10:00:00+02:00');
  });

  it('Dubai (+04:00)', () => {
    expect(formatLocalIso(new Date('2026-07-01T08:00:00Z'), 'Asia/Dubai')).toBe(
      '2026-07-01T12:00:00+04:00',
    );
  });

  it('New York summer is -04:00 and winter is -05:00', () => {
    expect(
      formatLocalIso(new Date('2026-07-01T12:00:00Z'), 'America/New_York'),
    ).toBe('2026-07-01T08:00:00-04:00');
    expect(
      formatLocalIso(new Date('2026-01-15T12:00:00Z'), 'America/New_York'),
    ).toBe('2026-01-15T07:00:00-05:00');
  });

  it('keeps half-hour offsets (India +05:30)', () => {
    expect(
      formatLocalIso(new Date('2026-01-15T08:00:00Z'), 'Asia/Kolkata'),
    ).toBe('2026-01-15T13:30:00+05:30');
  });

  it('moves to the next local day when the offset crosses midnight', () => {
    expect(
      formatLocalIso(new Date('2026-01-15T23:00:00Z'), 'Africa/Cairo'),
    ).toBe('2026-01-16T01:00:00+02:00');
  });

  it('UTC gives +00:00', () => {
    expect(formatLocalIso(new Date('2026-01-15T08:00:00Z'), 'UTC')).toBe(
      '2026-01-15T08:00:00+00:00',
    );
  });
});