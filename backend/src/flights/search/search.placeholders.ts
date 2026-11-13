// TEMPORARY PLACEHOLDERS. Delete or replace each part when the teammate's
// real work is merged. Nothing else in search/ depends on guessed field names.
import type { CabinClass } from './search.constants';

// WAITING FOR: member 2 (Flight schema, FLT-03 / FLT-04).
// The shape my search needs from one flight. When the real Flight schema
// exists, I map its fields to this shape in one place instead of
// rewriting the whole search.
export interface SearchableFlight {
  id: string;
  flightNumber: string;
  airline: { id: string; name: string; isActive: boolean };
  originCode: string; // IATA code
  destinationCode: string; // IATA code
  departureTime: Date; // UTC
  arrivalTime: Date; // UTC
  status: string; // search only returns flights that are "Scheduled" (FLT-30)
  cabins: {
    cabin: CabinClass;
    fare: number; // price for one adult or child
    totalSeats: number;
    bookedSeats: number;
  }[];
}

// WAITING FOR: member 4 (inventory holds, FLT-22).
// How many seats of a cabin are temporarily held. Always 0 for now, so
// available seats = total - booked until holds exist.
export function getHeldSeats(
  _flightId: string,
  _cabin: CabinClass,
): Promise<number> {
  return Promise.resolve(0);
}