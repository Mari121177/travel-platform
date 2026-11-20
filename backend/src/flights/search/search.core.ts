import { PAGE_SIZE } from './search.constants';
import { formatLocalIso } from './search.local-time';
import {
  durationMinutes,
  seatsNeeded,
  sortResults,
  totalFare,
} from './search.utils';
import type {
  AirportInfo,
  LegCriteria,
  SearchableFlight,
} from './search.types';
import type {
  CabinOptionDto,
  FlightSearchPageDto,
  FlightSearchResultDto,
} from './dto/flight-search-response.dto';

interface Row {
  result: FlightSearchResultDto;
  price: number;
  durationMinutes: number;
  departureTime: Date;
}

// FLT-11, FLT-12, FLT-15: turns the flights found for one leg into one page of
// results. Pure function: no database, so every rule here is unit tested.
export function buildLegPage(
  flights: SearchableFlight[],
  airports: Map<string, AirportInfo>,
  c: LegCriteria,
): FlightSearchPageDto {
  const party = { adults: c.adults, children: c.children, infants: c.infants };
  const seats = seatsNeeded(party); // infants take no seat
  const rows: Row[] = [];

  for (const flight of flights) {
    // ACC-15: deactivated airlines are hidden from search
    if (!flight.airline.isActive) continue;
    const origin = airports.get(flight.originCode);
    const destination = airports.get(flight.destinationCode);
    if (!origin || !destination) continue;

    // Cabins that match the cabin filter and have enough free seats for the party
    const options: CabinOptionDto[] = flight.cabins
      .filter((cab) => !c.cabin || cab.cabin === c.cabin)
      .map((cab) => ({
        cabin: cab.cabin,
        fare: cab.fare,
        totalPrice: totalFare(cab.fare, party),
        seatsAvailable: cab.totalSeats - cab.bookedSeats - cab.heldSeats,
      }))
      .filter((o) => o.seatsAvailable >= seats)
      .sort((a, b) => a.fare - b.fare);
    if (options.length === 0) continue;

    // Mariam's rule: the chosen cabin, or else the cheapest cabin with enough
    // seats. The filter and sort use the per-person fare (options are sorted).
    const price = options[0].fare;
    if (c.minPrice !== undefined && price < c.minPrice) continue; // inclusive
    if (c.maxPrice !== undefined && price > c.maxPrice) continue; // inclusive

    const duration = durationMinutes(flight.departureTime, flight.arrivalTime);
    rows.push({
      price,
      durationMinutes: duration,
      departureTime: flight.departureTime,
      result: {
        id: flight.id,
        flightNumber: flight.flightNumber,
        airline: { id: flight.airline.id, name: flight.airline.name },
        origin,
        destination,
        departureTime: flight.departureTime.toISOString(),
        arrivalTime: flight.arrivalTime.toISOString(),
        // GEN-06: each time is shown in its own airport's time zone
        departureLocal: formatLocalIso(flight.departureTime, origin.timeZone),
        arrivalLocal: formatLocalIso(flight.arrivalTime, destination.timeZone),
        durationMinutes: duration,
        price,
        cabins: options,
      },
    });
  }

  const sorted = sortResults(rows, c.sortBy, c.order);
  const start = (c.page - 1) * PAGE_SIZE;
  return {
    data: sorted.slice(start, start + PAGE_SIZE).map((r) => r.result),
    total: sorted.length,
    page: c.page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(sorted.length / PAGE_SIZE),
  };
}
