/**
 * Injection token the payments module (member 7) provides, e.g.
 *   { provide: 'PAYMENTS_PORT', useExisting: PaymentsService }
 * in a module that is @Global() and exports it. Injected with @Optional(), so
 * hotel-bookings still works while payments is not merged.
 */
export const PAYMENTS_PORT = 'PAYMENTS_PORT';

export interface PaymentsPort {
  /** Called after our 10-minute timer expired a reservation: cancel the Stripe PaymentIntent. */
  cancelForExpiredHold(type: 'hotel' | 'flight', bookingId: string): Promise<unknown>;

  /** Called on user cancellation with refund > 0. Returns the refund id (or { id }). */
  refund(
    type: 'hotel' | 'flight',
    bookingId: string,
    amount: number, // platform currency, major units (e.g. 3600), NOT cents
    reason: string, // 'UserCancellation'
  ): Promise<string | { id: string }>;
}
