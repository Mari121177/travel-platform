import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ItineraryVisibility } from '../schemas/itinerary.schema';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const upperCodes = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? value.map((v) => (typeof v === 'string' ? v.trim().toUpperCase() : v))
    : value;

export class CreateItineraryDto {
  @ApiProperty({ example: 'Summer in Europe' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(100)
  title!: string;

  @ApiProperty({
    example: ['FR', 'IT'],
    description: 'Country codes from the seeded countries collection',
  })
  @Transform(upperCodes)
  @IsArray()
  @ArrayNotEmpty({ message: 'Select at least one country' })
  @ArrayUnique()
  @IsString({ each: true })
  countries!: string[];

  @ApiProperty({ example: '2026-12-20', description: 'ISO date of day 1' })
  @IsDateString({}, { message: 'Start date must be a valid ISO date' })
  startDate!: string;

  @ApiPropertyOptional({
    enum: Object.values(ItineraryVisibility),
    default: ItineraryVisibility.Private,
  })
  @IsOptional()
  @IsIn(Object.values(ItineraryVisibility))
  visibility?: ItineraryVisibility;
}