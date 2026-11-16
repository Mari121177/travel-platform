// Cabin categories come from member 2's enum (FLT-04), so both sides share them
import { CabinClass } from '../enums/flight.enums';

export { CabinClass };
export const CABIN_CLASSES = Object.values(CabinClass);

// FLT-15: results can be sorted by price, duration or departure time
export const SORT_FIELDS = ['price', 'duration', 'departureTime'] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

// FLT-12: infants pay 10% of the cabin fare
export const INFANT_FARE_RATE = 0.1;

// GEN-05: fixed page size, clients cannot change it
export const PAGE_SIZE = 10;