import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export enum BookingGroup {
  Upcoming = 'upcoming',
  Past = 'past',
  Cancelled = 'cancelled',
}

export class ListFlightBookingsQueryDto {
  @ApiPropertyOptional({
    enum: BookingGroup,
    description: 'Upcoming, past or cancelled (FLT-25). Omit for all.',
  })
  @IsOptional()
  @IsEnum(BookingGroup)
  group?: BookingGroup;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}