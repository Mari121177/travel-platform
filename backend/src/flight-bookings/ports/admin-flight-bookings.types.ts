export type AdminFlightBookingStatus =
  | 'PendingPayment'
  | 'Confirmed'
  | 'Expired'
  | 'Cancelled'
  | 'Completed';

export interface AdminFlightBookingFilter {
  status?: AdminFlightBookingStatus;
  /** createdAt range, both ends inclusive: YYYY-MM-DD or ISO date-time. */
  from?: string;
  to?: string;
  /** 1-based. Default 1. */
  page?: number;
  /** Default 10, maximum 100. */
  limit?: number;
}

export interface AdminFlightBookingItem {
  type: 'flight';
  bookingId: string;
  reference: string | null; // null while Pending Payment
  userId: string;
  flightId: string;
  flightNumber: string;
  airlineId: string;
  airlineName: string;
  origin: string; // IATA code
  destination: string; // IATA code
  departureTime: Date; // outbound departure
  arrivalTime: Date; // last arrival; for round-trip use the return leg
  totalPrice: number; // platform currency
  status: AdminFlightBookingStatus;
  createdAt: Date;
}

export interface AdminFlightBookingPage {
  data: AdminFlightBookingItem[];
  total: number; // total after filters, not the page length
  page: number;
  limit: number;
}