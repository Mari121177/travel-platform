import type { BookingStatus } from '../hotel-booking.constants';

/** "Completed" is derived: a Confirmed reservation whose check-out date has passed. */
export type AdminBookingStatus = BookingStatus | 'Completed';

export interface AdminHotelBookingFilter {
  status?: AdminBookingStatus;
  /** createdAt range, both ends inclusive. "YYYY-MM-DD" or an ISO date-time string. */
  from?: string;
  to?: string;
  /** 1-based. Default 1. */
  page?: number;
  /** Default 10, maximum 100. Used by the combined admin bookings list. */
  limit?: number;
  /** checkIn range, both ends inclusive, YYYY-MM-DD. */
  travelFrom?: string;
  travelTo?: string;
}

export interface AdminHotelBookingItem {
  type: 'hotel';
  bookingId: string;
  reference: string | null; // null while still Pending Payment
  userId: string;
  hotelId: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  status: AdminBookingStatus;
  createdAt: Date;
}

export interface AdminHotelBookingPage {
  data: AdminHotelBookingItem[];
  total: number;
  page: number;
  limit: number;
}