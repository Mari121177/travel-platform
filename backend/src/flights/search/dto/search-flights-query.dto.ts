import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { CABIN_CLASSES, SORT_FIELDS, SORT_ORDERS } from '../search.constants';
import type { CabinClass, SortField, SortOrder } from '../search.constants';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const IATA = /^[A-Za-z]{3}$/;

// Trim and upper-case text such as "cai" so that "cai" and "CAI" both work.
// Non-strings (for example ?origin=a&origin=b gives an array) are left alone,
// so @Matches rejects them.
const normalizeCode = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

// FLT-11, FLT-12, FLT-15: query parameters of GET /api/flights/search
export class SearchFlightsQueryDto {
  @ApiProperty({ example: 'CAI', description: 'Departure airport IATA code' })
  @Transform(normalizeCode)
  @Matches(IATA, { message: 'origin must be a 3-letter IATA code' })
  origin!: string;

  @ApiProperty({ example: 'DXB', description: 'Arrival airport IATA code' })
  @Transform(normalizeCode)
  @Matches(IATA, { message: 'destination must be a 3-letter IATA code' })
  destination!: string;

  @ApiProperty({
    example: '2026-12-20',
    description: 'Departure date, local date at the departure airport',
  })
  @Matches(DATE_ONLY, { message: 'departureDate must be YYYY-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'departureDate is not a real date' })
  departureDate!: string;

  @ApiPropertyOptional({
    example: '2026-12-27',
    description:
      'Return date, local date at the arrival airport. Makes it a round trip (FLT-12)',
  })
  @IsOptional()
  @Matches(DATE_ONLY, { message: 'returnDate must be YYYY-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'returnDate is not a real date' })
  returnDate?: string;

  // FLT-12: adult 12+, child 2-11, infant under 2
  @ApiPropertyOptional({ default: 1, description: 'Adults (12+), at least 1' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'at least one adult is required' })
  adults: number = 1;

  @ApiPropertyOptional({ default: 0, description: 'Children (2-11)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  children: number = 0;

  @ApiPropertyOptional({
    default: 0,
    description: 'Infants (under 2), no seat',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  infants: number = 0;

  @ApiPropertyOptional({
    enum: CABIN_CLASSES,
    description: 'Optional cabin filter',
  })
  @IsOptional()
  @IsIn(CABIN_CLASSES)
  cabin?: CabinClass;

  // FLT-15: inclusive range; min > max is checked in validateSearchCriteria
  @ApiPropertyOptional({
    example: 100,
    description: 'Minimum price, inclusive',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    example: 500,
    description: 'Maximum price, inclusive',
  })
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

  // GEN-05: the page size is fixed at 10 (PAGE_SIZE), so there is no limit param
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page: number = 1;
}
