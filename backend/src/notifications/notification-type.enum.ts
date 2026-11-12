/**
 * Types of in-app notifications (GEN-01).
 * Import this enum when you call NotificationsService.send(...).
 * Need a new type? Ask Teammate 7 to add it here.
 */
export enum NotificationType {
  // FLT-23, HTL-17: booking confirmed (Teammates 4 and 6)
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  // FLT-26, HTL-21: booking cancelled by the user (Teammates 4 and 6)
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',

  // FLT-05: departure/arrival time changed (Teammate 2)
  FLIGHT_SCHEDULE_CHANGED = 'FLIGHT_SCHEDULE_CHANGED',
  // FLT-06: flight cancelled by the airline (Teammate 2)
  FLIGHT_CANCELLED = 'FLIGHT_CANCELLED',

  // PAY-03: refund result (Teammate 7)
  REFUND_ISSUED = 'REFUND_ISSUED',
  REFUND_FAILED = 'REFUND_FAILED',

  // ACC-15, ACC-16: admin actions (Teammate 1)
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  ACCOUNT_REACTIVATED = 'ACCOUNT_REACTIVATED',
  PROVIDER_DEACTIVATED = 'PROVIDER_DEACTIVATED',
  PROVIDER_REACTIVATED = 'PROVIDER_REACTIVATED',

  // Anything else
  GENERAL = 'GENERAL',
}
