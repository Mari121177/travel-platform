/**
 * Contract agreed with Member 4 (flight bookings) and Member 6 (hotel bookings).
 *
 * Each booking module is @Global() and provides its service under its token.
 * PaymentsModule is @Global() and provides PaymentsService under PAYMENTS_PORT.
 * The modules never import each other: payments looks the booking services up
 * by token when it needs them, so there is no circular dependency.
 */
// Member 6's tokens, reused so there is only one string per token.
export { HOTEL_BOOKING_PORT } from '../../hotel-bookings/ports/hotel-booking.port';
export { PAYMENTS_PORT } from '../../hotel-bookings/ports/payments.port';
export type { PaymentsPort } from '../../hotel-bookings/ports/payments.port';
/** Member 4's token. Looked up only when needed, so it is optional until it exists. */
export const FLIGHT_BOOKING_PORT = 'FLIGHT_BOOKING_PORT';

/** GEN-11 booking lifecycle. */
export type SharedBookingStatus =
  | 'PendingPayment'
  | 'Confirmed'
  | 'Completed'
  | 'Expired'
  | 'Cancelled';

/** What a booking module returns from getPayableBooking(). */
export interface PayableBooking {
  bookingId: string;
  type: 'hotel' | 'flight';
  reference?: string | null;
  userId: string;
  status: SharedBookingStatus | string;
  /** Full amount the user pays, in the platform currency (PAY-04). */
  totalPrice: number;
  /** End of the 10-minute hold (FLT-22, HTL-18). */
  holdExpiresAt: Date | string | null;
  /** Hotels: false when the hotel is deactivated (ACC-15). */
  hotelActive?: boolean;
  /** Flights: false when the airline is deactivated (ACC-15). */
  airlineActive?: boolean;
  /** PAY-02 policies shown to the user before paying. */
  policies: Record<string, unknown>;
  policiesAcceptedAt: Date | string | null;
}

/** Implemented by the flight and hotel booking services. */
export interface BookingPaymentPort {
  /** Throws 404 if the booking does not exist. No ownership check. */
  getPayableBooking(bookingId: string): Promise<PayableBooking>;
  /** Owner only (404 otherwise); 409 if not PendingPayment or the hold expired. */
  markPoliciesAccepted(bookingId: string, userId: string): Promise<unknown>;
  /** Safe to call twice; 409 if not PendingPayment or the hold expired. */
  confirmBooking(bookingId: string, paymentId: string): Promise<unknown>;
}
