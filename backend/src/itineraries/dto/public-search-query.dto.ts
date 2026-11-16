import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** ITN-21: search public itineraries. */
export class PublicSearchQueryDto {
  @ApiPropertyOptional({
    description: 'Keyword matched against title, country name or city name',
    example: 'egypt',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ description: 'Country code filter', example: 'EG' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  country?: string;

  @ApiPropertyOptional({
    description: 'City filter (cityId slug from the seeded cities)',
    example: 'cairo',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Minimum number of days', example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  minDays?: number;

  @ApiPropertyOptional({ description: 'Maximum number of days', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  maxDays?: number;

  @ApiPropertyOptional({ description: 'Page number (page size 10)', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page?: number;
}