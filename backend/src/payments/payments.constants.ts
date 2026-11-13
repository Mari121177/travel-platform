/**
 * PAY-04: every price, payment and refund uses one platform currency.
 * TODO: switch to the shared PLATFORM_CURRENCY constant in src/common once it is added.
 */
export const PLATFORM_CURRENCY = 'USD';

/** Stripe amounts are integers in the smallest currency unit (cents). */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

/** Rounds a money amount to 2 decimals. */
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Stripe's published test payment methods. Used only by the test-mode
 * confirm endpoint, so the full flow can be shown from Swagger without a frontend.
 */
export const TEST_PAYMENT_METHODS = [
  'pm_card_visa',
  'pm_card_chargeDeclined',
] as const;

export type TestPaymentMethod = (typeof TEST_PAYMENT_METHODS)[number];
