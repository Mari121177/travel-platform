import type { CabinClass } from './search.constants';

// The data the search logic needs for one flight. The service builds it from
// Malk's Flight, Cabin and Airline documents, so the search rules below stay
// independent of the database and can be tested without one.
export interface SearchableCabin {
  cabin: CabinClass;
  fare: number; // price for one adult or child (Cabin.price)
  totalSeats: number;
  bookedSeats: number;
  heldSeats: number; // temporary holds (FLT-22)
}

export interface SearchableFlight {
  id: string;
  flightNumber: string;
  airline: { id: string; name: string; isActive: boolean };
  originCode: string; // IATA code
  destinationCode: string; // IATA code
  departureTime: Date; // UTC
  arrivalTime: Date; // UTC
  cabins: SearchableCabin[];
}

export interface AirportInfo {
  iataCode: string;
  name: string;
  timeZone: string;
}

// What one leg of a search needs from the query
export interface LegCriteria {
  adults: number;
  children: number;
  infants: number;
  cabin?: CabinClass;
  minPrice?: number;
  maxPrice?: number;
  sortBy: 'price' | 'duration' | 'departureTime';
  order: 'asc' | 'desc';
  page: number;
}