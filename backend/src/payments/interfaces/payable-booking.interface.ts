import { BookingType } from '../enums/payment.enums';

/**
 * PROPOSAL for the week-1 agreement with Teammate 4 (flight bookings)
 * and Teammate 6 (hotel bookings). Not used by any code yet.
 *
 * Booking lifecycle (GEN-11), the ONLY allowed transitions:
 *   Pending Payment -> Confirmed -> Completed
 *   Pending Payment -> Expired    (10-minute hold timeout, FLT-22 / HTL-18)
 *   Confirmed       -> Cancelled  (user or provider cancellation)
 * A failed payment does NOT change the booking: it stays Pending Payment
 * and the user may retry until the hold expires (PAY-01).
 */
export type SharedBookingStatus =
  | 'PendingPayment'
  | 'Confirmed'
  | 'Completed'
  | 'Expired'
  | 'Cancelled';

/** What Payments needs to read from a booking before charging. */
export interface PayableBooking {
  id: string;
  type: BookingType;
  userId: string;
  status: SharedBookingStatus;
  /** Total agreed price in the platform currency (PAY-04). */
  amount: number;
  currency: string;
  /** End of the 10-minute hold. Payment is refused after this. */
  holdExpiresAt: Date;
  /** ACC-15: false means the airline/hotel is deactivated, so payment is refused. */
  providerActive: boolean;
  /**
   * PAY-02 policies to show and accept:
   *   flight: cancellation tiers (FLT-09) + baggage policy (FLT-04, FLT-08)
   *   hotel:  cancellation tiers (HTL-10) + check-in/check-out times (HTL-09)
   */
  policies: Record<string, unknown>;
}

/** Methods each booking service (flight and hotel) exposes to Payments. */
export interface BookingPaymentPort {
  /** Returns null if the booking does not exist. */
  getPayableBooking(bookingId: string): Promise<PayableBooking | null>;

  /**
   * Called ONLY after the Stripe webhook verifies the PaymentIntent succeeded.
   * The booking module sets Confirmed, books the seats/rooms, generates the
   * reference and sends the BOOKING_CONFIRMED notification (FLT-23 / HTL-17).
   */
  confirmBooking(bookingId: string, paymentId: string): Promise<void>;
}

/**
 * What Payments exposes to the booking modules (to be built in step 2):
 *
 *   PaymentsService.cancelForExpiredHold(type, bookingId)
 *     -> call when you set a booking to Expired; cancels the PaymentIntent (PAY-01)
 *
 *   PaymentsService.refund(type, bookingId, amount, reason)
 *     -> call when a Confirmed booking becomes Cancelled with amount > 0.
 *        You compute the amount from your tiers (FLT-26 / HTL-21), or 100%
 *        for provider cancellations (FLT-06). Payments calls Stripe, records
 *        the Refund and sends the refund notification (PAY-03).
 */
