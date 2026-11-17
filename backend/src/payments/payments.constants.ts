/**
 * PAY-04: one platform currency for every price, payment and refund.
 * Set by PLATFORM_CURRENCY in .env (default USD). Stored uppercase, sent lowercase to Stripe.
 */
export function platformCurrency(): string {
  const code = (process.env.PLATFORM_CURRENCY ?? '').trim().toUpperCase();
  return code || 'USD';
}

// Stripe amount rules: https://docs.stripe.com/currencies
const ZERO_DECIMAL = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];
const THREE_DECIMAL = ['BHD', 'JOD', 'KWD', 'OMR', 'TND'];

export function currencyDecimals(currency = platformCurrency()): number {
  const code = currency.toUpperCase();
  if (ZERO_DECIMAL.includes(code)) return 0;
  if (THREE_DECIMAL.includes(code)) return 3;
  return 2;
}

/** Stripe amounts are integers in the smallest unit (USD x100, JOD x1000, JPY x1). */
export function toMinorUnits(amount: number, currency = platformCurrency()): number {
  const decimals = currencyDecimals(currency);
  const minor = Math.round(amount * 10 ** decimals);
  // Three-decimal currencies: rounded to a multiple of 10 to be safe with Stripe
  return decimals === 3 ? Math.round(minor / 10) * 10 : minor;
}

/** Rounds to exactly what Stripe will charge, so the saved amount always matches. */
export function roundMoney(amount: number, currency = platformCurrency()): number {
  return toMinorUnits(amount, currency) / 10 ** currencyDecimals(currency);
}

/** e.g. "12.50 USD" or "12.500 JOD" */
export function formatMoney(amount: number, currency = platformCurrency()): string {
  return `${amount.toFixed(currencyDecimals(currency))} ${currency.toUpperCase()}`;
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
