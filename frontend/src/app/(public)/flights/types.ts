export type CabinClass = "Economy" | "Premium Economy" | "Business" | "First";

export interface AirportSummary {
  iataCode: string;
  name: string;
  timeZone: string;
}

// GET /api/airports -> items have more fields than the summary
export interface Airport extends AirportSummary {
  cityId: string;
  countryCode: string;
}

export interface Paged<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CabinOption {
  cabin: CabinClass;
  fare: number; // per adult/child
  totalPrice: number; // whole party (infants pay 10%)
  seatsAvailable: number;
}

export interface FlightResult {
  id: string;
  flightNumber: string;
  airline: { id: string; name: string };
  origin: AirportSummary;
  destination: AirportSummary;
  departureTime: string; // UTC
  arrivalTime: string; // UTC
  departureLocal: string; // origin local time, e.g. 2026-12-20T10:00:00+02:00
  arrivalLocal: string; // destination local time
  durationMinutes: number;
  price: number; // per person, used by filter and sort
  cabins: CabinOption[];
}

export interface SearchResponse {
  tripType: "one-way" | "round-trip";
  outbound: Paged<FlightResult>;
  return?: Paged<FlightResult>;
  message?: string; // "No flights found"
}

export interface FlightDetails {
  id: string;
  flightNumber: string;
  status: "Scheduled" | "Cancelled" | "Departed";
  airline: { id: string; name: string; code: string };
  origin: AirportSummary;
  destination: AirportSummary;
  departureTime: string;
  arrivalTime: string;
  departureLocal: string;
  arrivalLocal: string;
  durationMinutes: number;
  cabins: {
    cabin: CabinClass;
    price: number;
    seatsRemaining: number;
    freeBags: number;
    maxBagWeightKg: number;
  }[];
  extraBaggage: { pricePerBag?: number; maxExtraBags: number };
  cancellationPolicy: { daysBeforeDeparture: number; refundPercent: number }[]; // can be empty
}