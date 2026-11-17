export interface CancellationTier {
  daysBeforeDeparture: number;
  refundPercent: number;
}

/** Whole days (floored) between now and departure. */
export function daysUntil(departure: Date, now: Date = new Date()): number {
  return Math.floor((departure.getTime() - now.getTime()) / 86_400_000);
}

/**
 * FLT-09: use the tier with the highest threshold NOT exceeding the days remaining.
 * If no tier applies, the refund is 0%.
 */
export function refundPercentFor(tiers: CancellationTier[], daysRemaining: number): number {
  const applicable = tiers
    .filter((t) => t.daysBeforeDeparture <= daysRemaining)
    .sort((a, b) => b.daysBeforeDeparture - a.daysBeforeDeparture);
  return applicable[0]?.refundPercent ?? 0;
}
