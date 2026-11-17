import { CABIN_CLASSES } from './search.constants';
import type { CabinClass } from './search.constants';
import { formatLocalIso } from './search.local-time';
import { durationMinutes } from './search.utils';
import type { AirportInfo } from './search.types';
import type { FlightDetailsDto } from './dto/flight-details.dto';

// What the details page needs, taken from Malk's Flight, Cabin and Airline
// documents by the service. Keeping it separate lets the rules be unit tested.
export interface DetailsSource {
  flight: {
    id: string;
    flightNumber: string;
    status: string;
    departureTime: Date;
    arrivalTime: Date;
  };
  airline: {
    id: string;
    name: string;
    code: string;
    extraBagPrice?: number;
    maxExtraBags: number;
    cancellationTiers: { daysBeforeDeparture: number; refundPercent: number }[];
  };
  cabins: {
    cabin: CabinClass;
    price: number;
    totalSeats: number;
    bookedSeats: number;
    heldSeats: number;
    freeBags: number;
    maxBagWeightKg: number;
  }[];
  origin: AirportInfo;
  destination: AirportInfo;
}

// FLT-17: flight details with local times (GEN-06), every cabin's price, free
// seats and baggage allowance, and the airline's baggage and cancellation rules.
export function buildFlightDetails(s: DetailsSource): FlightDetailsDto {
  const order = (c: CabinClass) => CABIN_CLASSES.indexOf(c);
  return {
    id: s.flight.id,
    flightNumber: s.flight.flightNumber,
    status: s.flight.status,
    airline: { id: s.airline.id, name: s.airline.name, code: s.airline.code },
    origin: s.origin,
    destination: s.destination,
    departureTime: s.flight.departureTime.toISOString(),
    arrivalTime: s.flight.arrivalTime.toISOString(),
    departureLocal: formatLocalIso(s.flight.departureTime, s.origin.timeZone),
    arrivalLocal: formatLocalIso(s.flight.arrivalTime, s.destination.timeZone),
    durationMinutes: durationMinutes(
      s.flight.departureTime,
      s.flight.arrivalTime,
    ),
    cabins: [...s.cabins]
      .sort((a, b) => order(a.cabin) - order(b.cabin))
      .map((c) => ({
        cabin: c.cabin,
        price: c.price,
        seatsRemaining: Math.max(0, c.totalSeats - c.bookedSeats - c.heldSeats),
        freeBags: c.freeBags,
        maxBagWeightKg: c.maxBagWeightKg,
      })),
    extraBaggage: {
      pricePerBag: s.airline.extraBagPrice,
      maxExtraBags: s.airline.maxExtraBags,
    },
    cancellationPolicy: [...s.airline.cancellationTiers]
      .sort((a, b) => b.daysBeforeDeparture - a.daysBeforeDeparture)
      .map((t) => ({
        daysBeforeDeparture: t.daysBeforeDeparture,
        refundPercent: t.refundPercent,
      })),
  };
}