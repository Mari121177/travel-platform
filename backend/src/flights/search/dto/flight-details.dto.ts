import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CABIN_CLASSES } from '../search.constants';
import type { CabinClass } from '../search.constants';
import { AirportSummaryDto } from './flight-search-response.dto';

export class DetailsAirlineDto {
  @ApiProperty({ example: '665f1c2e9b1e8a0012a4b7c1' })
  id!: string;

  @ApiProperty({ example: 'EgyptAir' })
  name!: string;

  @ApiProperty({ example: 'MS', description: 'IATA airline code' })
  code!: string;
}

// FLT-17: one cabin with its price, free seats and free baggage allowance
export class DetailsCabinDto {
  @ApiProperty({ enum: CABIN_CLASSES })
  cabin!: CabinClass;

  @ApiProperty({ example: 250, description: 'Fare for one adult or child' })
  price!: number;

  @ApiProperty({
    example: 12,
    description: 'Seats left (total minus booked minus held)',
  })
  seatsRemaining!: number;

  @ApiProperty({ example: 1, description: 'Free checked bags per passenger' })
  freeBags!: number;

  @ApiProperty({ example: 23, description: 'Maximum kg per free bag' })
  maxBagWeightKg!: number;
}

export class ExtraBaggageDto {
  @ApiPropertyOptional({ example: 40, description: 'Price of one extra bag' })
  pricePerBag?: number;

  @ApiProperty({ example: 2, description: 'Most extra bags allowed' })
  maxExtraBags!: number;
}

export class CancellationTierDto {
  @ApiProperty({
    example: 7,
    description: 'At least this many days before departure',
  })
  daysBeforeDeparture!: number;

  @ApiProperty({
    example: 80,
    description: 'Share of the price refunded (0-100)',
  })
  refundPercent!: number;
}

export class FlightDetailsDto {
  @ApiProperty({ example: '665f1c2e9b1e8a0012a4b7d2' })
  id!: string;

  @ApiProperty({ example: 'MS915' })
  flightNumber!: string;

  @ApiProperty({ enum: ['Scheduled', 'Cancelled', 'Departed'] })
  status!: string;

  @ApiProperty({ type: () => DetailsAirlineDto })
  airline!: DetailsAirlineDto;

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
    description: 'Origin airport local time (GEN-06)',
  })
  departureLocal!: string;

  @ApiProperty({
    example: '2026-12-20T15:30:00+04:00',
    description: 'Destination airport local time (GEN-06)',
  })
  arrivalLocal!: string;

  @ApiProperty({ example: 210, description: 'Duration in minutes' })
  durationMinutes!: number;

  @ApiProperty({
    type: () => [DetailsCabinDto],
    description: 'Economy first, First last',
  })
  cabins!: DetailsCabinDto[];

  @ApiProperty({ type: () => ExtraBaggageDto })
  extraBaggage!: ExtraBaggageDto;

  @ApiProperty({
    type: () => [CancellationTierDto],
    description:
      'Airline cancellation policy, earliest tier first (empty if none)',
  })
  cancellationPolicy!: CancellationTierDto[];
}