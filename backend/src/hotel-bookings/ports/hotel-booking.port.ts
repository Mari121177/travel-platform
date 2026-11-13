import { BookingStatus } from '../hotel-booking.constants';

/** Injection token. Provided (and exported) by HotelBookingsModule, which is @Global. */
export const HOTEL_BOOKING_PORT = 'HOTEL_BOOKING_PORT';

export interface PayableBooking {
  bookingId: string;
  type: 'hotel';
  reference: string | null;
  hotelName: string;
  userId: string;
  status: BookingStatus;
  totalPrice: number; // platform currency (PAY-04)
  holdExpiresAt: Date | null;
  hotelActive: boolean;
  policies: {
    cancellationTiers: { daysBefore: number; refundPercent: number }[];
    checkInTime?: string;
    checkOutTime?: string;
  };
  policiesAcceptedAt: Date | null;
}

/** What the payments module may call on hotel bookings. */
export interface HotelBookingPort {
  getPayableBooking(bookingId: string): Promise<PayableBooking>;
  confirmBooking(bookingId: string, paymentId?: string): Promise<unknown>;
  markPoliciesAccepted(bookingId: string, userId: string): Promise<unknown>;
}
