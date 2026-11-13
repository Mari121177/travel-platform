import { FlightBookingStatus } from '../enums/flight-booking-status.enum';

/** Injection token. Provided (and exported) by FlightBookingsModule, which is @Global. */
export const FLIGHT_BOOKING_PORT = 'FLIGHT_BOOKING_PORT';

export interface PayableFlightBooking {
  bookingId: string;
  type: 'flight';
  reference: string | null;
  userId: string;
  status: FlightBookingStatus;
  totalPrice: number; // platform currency
  holdExpiresAt: Date | null;
  airlineActive: boolean;
  policies: {
    cancellationTiers: { daysBefore: number; refundPercent: number }[];
    baggagePolicy: {
      pricePerExtraBag: number;
      maxExtraBagsPerPassenger: number;
    } | null;
  };
  policiesAcceptedAt: Date | null;
}

/** What the payments module may call on flight bookings. */
export interface FlightBookingPort {
  getPayableBooking(bookingId: string): Promise<PayableFlightBooking>;
  confirmBooking(bookingId: string, paymentId?: string): Promise<unknown>;
  markPoliciesAccepted(bookingId: string, userId: string): Promise<unknown>;
}