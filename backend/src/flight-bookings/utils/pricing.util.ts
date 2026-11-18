export interface BaggagePolicyInput {
  pricePerExtraBag: number;
  maxExtraBagsPerPassenger: number;
}

export interface CancellationTier {
  daysBefore: number;
  refundPercent: number;
}

/** FLT-19: fee = number of extra bags x price per bag, summed over passengers. */
export function calculateBaggageFee(
  extraBagCounts: number[],
  policy: BaggagePolicyInput | null,
): number {
  if (!policy) return 0;
  const totalBags = extraBagCounts.reduce((sum, n) => sum + n, 0);
  return round2(totalBags * policy.pricePerExtraBag);
}

/** FLT-19/21: total = (base fare x passengers) + baggage fee. */
export function calculateTotal(
  baseFarePerPassenger: number,
  passengerCount: number,
  baggageFee: number,
): number {
  return round2(baseFarePerPassenger * passengerCount + baggageFee);
}

/**
 * FLT-09: use the tier with the highest threshold that does not exceed the days remaining.
 * ASSUMPTION: if no tier applies, the refund is 0. The end of the FLT-09 sentence was cut
 * off in the screenshot, so confirm it in the Excel sheet.
 */
export function calculateRefundPercent(
  tiers: CancellationTier[],
  daysRemaining: number,
): number {
  const applicable = tiers
    .filter((t) => t.daysBefore <= daysRemaining)
    .sort((a, b) => b.daysBefore - a.daysBefore);
  return applicable.length ? applicable[0].refundPercent : 0;
}

export function calculateRefundAmount(
  total: number,
  refundPercent: number,
): number {
  return round2((total * refundPercent) / 100);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}