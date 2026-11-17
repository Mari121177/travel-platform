export enum BookingStatus {
  PendingPayment = 'PendingPayment',
  Confirmed = 'Confirmed',
  Expired = 'Expired',
  Cancelled = 'Cancelled',
}

export enum RoomNightStatus {
  Held = 'held',
  Confirmed = 'confirmed',
}

export const HOLD_MINUTES = 10; // HTL-18
export const PAGE_SIZE = 10; // GEN-05
