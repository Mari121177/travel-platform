/** Injection token. Provided by Member 7's @Global PaymentsModule. */
export const PAYMENTS_PORT = 'PAYMENTS_PORT';

/** Same shape as the hotel-bookings payments port, so payments treats both alike. */
export interface PaymentsPort {
  cancelForExpiredHold(
    type: 'hotel' | 'flight',
    bookingId: string,
  ): Promise<unknown>;
  refund(
    type: 'hotel' | 'flight',
    bookingId: string,
    amount: number,
    reason: string,
  ): Promise<string | { id: string }>;
}

// reason: 'UserCancellation' (FLT-26) or 'ProviderCancellation' (FLT-06, 100%)