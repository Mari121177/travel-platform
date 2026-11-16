import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

// Trim text; non-strings (repeated params arrive as arrays) are left alone so
// the validators below reject them.
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// FLT-02. The page size is fixed at 10 (GEN-05), so there is no limit param.
export class ListAirportsQueryDto {
  @ApiPropertyOptional({
    example: 'cairo',
    description: 'Search in the airport name or IATA code',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ example: 'EG', description: '2-letter country code' })
  @IsOptional()
  @Transform(trim)
  @Matches(/^[A-Za-z]{2}$/, { message: 'countryCode must be 2 letters' })
  countryCode?: string;

  @ApiPropertyOptional({ example: 'cairo' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(50)
  cityId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;
}