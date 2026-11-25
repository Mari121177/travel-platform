import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, Matches } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ListCitiesQueryDto {
  @ApiPropertyOptional({
    example: 'EG',
    description: 'Only return the cities of this 2-letter country code',
  })
  @IsOptional()
  @Transform(trim)
  @Matches(/^[A-Za-z]{2}$/, { message: 'countryCode must be 2 letters' })
  countryCode?: string;
}
