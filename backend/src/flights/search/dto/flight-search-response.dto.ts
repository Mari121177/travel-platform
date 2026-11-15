import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CABIN_CLASSES } from '../search.constants';
import type { CabinClass } from '../search.constants';

export class AirportSummaryDto {
  @ApiProperty({ example: 'CAI' })
  iataCode!: string;

  @ApiProperty({ example: 'Cairo International Airport' })
  name!: string;

  @ApiProperty({ example: 'Africa/Cairo', description: 'IANA time zone' })
  timeZone!: string;
}

export class AirlineSummaryDto {
  @ApiProperty({ example: '665f1c2e9b1e8a0012a4b7c1' })
  id!: string;

  @ApiProperty({ example: 'EgyptAir' })
  name!: string;
}

// FLT-11 / FLT-12 / FLT-17: one bookable cabin of a flight
export class CabinOptionDto {
  @ApiProperty({ enum: CABIN_CLASSES })
  cabin!: CabinClass;

  @ApiProperty({ example: 250, description: 'Fare for one adult or child' })
  fare!: number;

  @ApiProperty({
    example: 575,
    description:
      'Total for the whole party: adults and children pay the fare, infants pay 10%',
  })
  totalPrice!: number;

  @ApiProperty({
    example: 12,
    description: 'Seats left (total minus booked minus held)',
  })
  seatsAvailable!: number;
}

export class FlightSearchResultDto {
  @ApiProperty({ example: '665f1c2e9b1e8a0012a4b7d2' })
  id!: string;

  @ApiProperty({ example: 'MS915' })
  flightNumber!: string;

  @ApiProperty({ type: () => AirlineSummaryDto })
  airline!: AirlineSummaryDto;

  @ApiProperty({ type: () => AirportSummaryDto })
  origin!: AirportSummaryDto;

  @ApiProperty({ type: () => AirportSummaryDto })
  destination!: AirportSummaryDto;

  @ApiProperty({ example: '2026-12-20T08:00:00.000Z', description: 'UTC' })
  departureTime!: string;

  @ApiProperty({ example: '2026-12-20T11:30:00.000Z', description: 'UTC' })
  arrivalTime!: string;

  @ApiProperty({
    example: '2026-12-20T10:00:00+02:00',
    description: 'Departure in the origin airport local time (GEN-06)',
  })
  departureLocal!: string;

  @ApiProperty({
    example: '2026-12-20T15:30:00+04:00',
    description: 'Arrival in the destination airport local time (GEN-06)',
  })
  arrivalLocal!: string;

  @ApiProperty({ example: 210, description: 'Duration in minutes' })
  durationMinutes!: number;

    @ApiProperty({
    example: 250,
    description:
      'Per-person fare used by the price filter and price sort: the chosen cabin, or the cheapest cabin with enough seats for the party',
  })
  price!: number;

  @ApiProperty({ type: () => [CabinOptionDto] })
  cabins!: CabinOptionDto[];
}

// GEN-05: paginated list
export class FlightSearchPageDto {
  @ApiProperty({ type: () => [FlightSearchResultDto] })
  data!: FlightSearchResultDto[];

  @ApiProperty({ example: 25, description: 'Total matches before pagination' })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10, description: 'Fixed page size (GEN-05)' })
  pageSize!: number;
}

// FLT-12: a one-way search fills only `outbound`; a round trip also fills `return`
export class SearchFlightsResponseDto {
  @ApiProperty({ enum: ['one-way', 'round-trip'] })
  tripType!: 'one-way' | 'round-trip';

  @ApiProperty({ type: () => FlightSearchPageDto })
  outbound!: FlightSearchPageDto;

  @ApiPropertyOptional({ type: () => FlightSearchPageDto })
  return?: FlightSearchPageDto;
}