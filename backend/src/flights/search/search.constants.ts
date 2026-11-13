// Cabin categories are fixed by FLT-04. If the Flight schema (FLT-04) defines
// its own enum, switch to it so both sides use the same values.
export const CABIN_CLASSES = [
  'Economy',
  'Premium Economy',
  'Business',
  'First',
] as const;
export type CabinClass = (typeof CABIN_CLASSES)[number];

// FLT-15: results can be sorted by price, duration or departure time
export const SORT_FIELDS = ['price', 'duration', 'departureTime'] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

// FLT-12: infants pay 10% of the cabin fare
export const INFANT_FARE_RATE = 0.1;

// GEN-05: page size 10
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;