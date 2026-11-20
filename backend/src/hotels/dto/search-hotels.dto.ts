import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn, IsInt, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, Min,
} from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/hotels/search  (HTL-11, HTL-12)
export class SearchHotelsDto {
  // City OR country (at least one is required; checked in the service)
  @ApiPropertyOptional({
    description: 'City id from the seeded cities. Give a city or a country',
    example: 'cairo',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  cityId?: string;

  @ApiPropertyOptional({ description: '2-letter country code', example: 'EG' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z]{2}$/, { message: 'countryCode must be a 2-letter code, e.g. EG' })
  countryCode?: string;

  @ApiProperty({ description: 'Check-in date (YYYY-MM-DD), today or later', example: '2026-12-15' })
  @Matches(DATE_REGEX, { message: 'checkIn must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  checkIn: string;

  @ApiProperty({ description: 'Check-out date (YYYY-MM-DD), after check-in', example: '2026-12-18' })
  @Matches(DATE_REGEX, { message: 'checkOut must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  checkOut: string;

  @ApiProperty({ description: 'Total number of guests', example: 2, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  guests: number;

  @ApiPropertyOptional({
    description: 'Number of rooms (not more than the guests)',
    default: 1,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  rooms: number = 1; // HTL-11: default 1

  // HTL-12: inclusive price range, compared to the hotel's cheapest free room
  @ApiPropertyOptional({ description: 'Minimum price per night (inclusive) of the cheapest free room' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price per night (inclusive) of the cheapest free room' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  // HTL-12: minimum average rating; unrated hotels are excluded when set
  @ApiPropertyOptional({
    description: 'Minimum average rating (1-5). Hotels without reviews are left out',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ enum: ['price', 'rating'], default: 'price', description: 'Sort field' })
  @IsOptional()
  @IsIn(['price', 'rating'])
  sortBy: 'price' | 'rating' = 'price';

  // Default: cheapest first for price, best first for rating
  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    description: 'Sort direction. Default: asc for price, desc for rating',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  // GEN-05: fixed page size of 10
  @ApiPropertyOptional({ description: 'Page number (10 hotels per page)', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;
}