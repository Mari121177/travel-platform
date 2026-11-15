import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DAY_NOTES_MAX_LENGTH } from '../itinerary.constants';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** ITN-05, ITN-09: every day needs a city from the seeded city list. */
export class AddDayDto {
  @ApiProperty({
    example: 'cairo',
    description: 'cityId from the seeded cities (for example "cairo")',
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Every day needs a city' })
  cityId!: string;

  @ApiPropertyOptional({
    example: 'Pyramids in the morning',
    maxLength: DAY_NOTES_MAX_LENGTH,
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(DAY_NOTES_MAX_LENGTH)
  notes?: string;
}
