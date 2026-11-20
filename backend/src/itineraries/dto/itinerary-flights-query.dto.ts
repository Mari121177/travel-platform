import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { CABIN_CLASSES } from '../../flights/search/search.constants';
import type {
  CabinClass,
  SortField,
  SortOrder,
} from '../../flights/search/search.constants';
import { SORT_FIELDS, SORT_ORDERS } from '../../flights/search/search.constants';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const IATA = /^[A-Za-z]{3}$/;

const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

const asBool = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === 1 || value === '1';

// ITN-26: search flights from a chosen origin to the first itinerary city.
export class ItineraryFlightsQueryDto {
  @ApiProperty({ example: 'LHR', description: 'Origin airport IATA code' })
  @Transform(upper)
  @Matches(IATA, { message: 'origin must be a 3-letter IATA code' })
  origin!: string;

  @ApiPropertyOptional({
    example: '2026-12-27',
    description: 'Return date; defaults to the itinerary last day when roundTrip is true',
  })
  @IsOptional()
  @Matches(DATE_ONLY, { message: 'returnDate must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  returnDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(asBool)
  @IsBoolean()
  roundTrip: boolean = false;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  adults: number = 1;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  children: number = 0;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  infants: number = 0;

  @ApiPropertyOptional({ enum: CABIN_CLASSES })
  @IsOptional()
  @IsIn(CABIN_CLASSES)
  cabin?: CabinClass;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ enum: SORT_FIELDS, default: 'price' })
  @IsOptional()
  @IsIn(SORT_FIELDS)
  sortBy: SortField = 'price';

  @ApiPropertyOptional({ enum: SORT_ORDERS, default: 'asc' })
  @IsOptional()
  @IsIn(SORT_ORDERS)
  order: SortOrder = 'asc';

  @ApiPropertyOptional({ default: 1, maximum: 100000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page: number = 1;
}
