/** Matches :type in /api/bookings/:type/:id/... */
export enum BookingType {
  FLIGHT = 'flight',
  HOTEL = 'hotel',
}

/** PAY-01: status of the Stripe PaymentIntent for a booking. */
export enum PaymentStatus {
  /** PaymentIntent created, waiting for the user to pay. */
  PENDING = 'Pending',
  /** Verified by the Stripe webhook. Only now is the booking confirmed. */
  SUCCEEDED = 'Succeeded',
  /** Last attempt failed. The user may retry until the hold expires. */
  FAILED = 'Failed',
  /** The hold expired, so the PaymentIntent was cancelled. */
  CANCELLED = 'Cancelled',
}

/** PAY-03: refund statuses shown on the booking details. */
export enum RefundStatus {
  PENDING = 'Pending',
  REFUNDED = 'Refunded',
  FAILED = 'Failed',
}

/** PAY-03: why the refund was issued. */
export enum RefundReason {
  /** FLT-26, HTL-21: amount from the provider's refund tiers. */
  USER_CANCELLATION = 'UserCancellation',
  /** FLT-06: provider cancelled, so 100% refund. */
  PROVIDER_CANCELLATION = 'ProviderCancellation',
}
