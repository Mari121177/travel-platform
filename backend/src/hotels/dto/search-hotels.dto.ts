import { Transform, Type } from 'class-transformer';
import {
  IsIn, IsInt, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, Min,
} from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/hotels/search  (HTL-11, HTL-12)
export class SearchHotelsDto {
  // City OR country (at least one is required; checked in the service)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  cityId?: string; // e.g. "cairo"

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z]{2}$/, { message: 'countryCode must be a 2-letter code, e.g. EG' })
  countryCode?: string;

  @Matches(DATE_REGEX, { message: 'checkIn must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  checkIn: string;

  @Matches(DATE_REGEX, { message: 'checkOut must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  checkOut: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  guests: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  rooms: number = 1; // HTL-11: default 1

  // HTL-12: inclusive price range, compared to the hotel's cheapest free room
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  // HTL-12: minimum average rating; unrated hotels are excluded when set
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @IsIn(['price', 'rating'])
  sortBy: 'price' | 'rating' = 'price';

  // Default: cheapest first for price, best first for rating
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  // GEN-05: fixed page size of 10
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;
}