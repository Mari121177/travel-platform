import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ACTIVITY_DESCRIPTION_MAX_LENGTH,
  ACTIVITY_NAME_MAX_LENGTH,
  CURRENCY_CODE_LENGTH,
  MAX_AMOUNT,
  TIME_REGEX,
} from '../itinerary.constants';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const upperCode = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateActivityDto {
  @ApiProperty({ example: 'Visit the Pyramids' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(ACTIVITY_NAME_MAX_LENGTH)
  name!: string;

  @ApiProperty({ example: 'Guided tour of the Giza plateau' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @MaxLength(ACTIVITY_DESCRIPTION_MAX_LENGTH)
  description!: string;

  @ApiPropertyOptional({ example: '09:30', description: 'HH:mm, 24-hour' })
  @IsOptional()
  @Matches(TIME_REGEX, { message: 'time must be HH:mm (24-hour)' })
  time?: string | null;

  @ApiPropertyOptional({
    example: 25.5,
    description: 'Needs a currency. At most 2 decimals.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_AMOUNT)
  cost?: number | null;

  @ApiPropertyOptional({
    example: 'USD',
    description: 'A currency code from the supported list. Needs a cost.',
  })
  @IsOptional()
  @Transform(upperCode)
  @IsString()
  @Length(CURRENCY_CODE_LENGTH, CURRENCY_CODE_LENGTH)
  currency?: string | null;
}
