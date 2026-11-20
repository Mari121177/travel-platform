import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, Matches } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/hotels/:id/rooms/available?checkIn=&checkOut=  (HTL-15)
export class StayQueryDto {
  @ApiProperty({ description: 'Check-in date (YYYY-MM-DD), today or later', example: '2026-12-15' })
  @Matches(DATE_REGEX, { message: 'checkIn must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  checkIn: string;

  @ApiProperty({ description: 'Check-out date (YYYY-MM-DD), after check-in', example: '2026-12-18' })
  @Matches(DATE_REGEX, { message: 'checkOut must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  checkOut: string;
}

// GET /api/hotels/:id?checkIn=&checkOut=  (HTL-02: dates are optional)
export class OptionalStayQueryDto {
  @ApiPropertyOptional({
    description: 'Optional check-in date (YYYY-MM-DD). Give both dates to see the free rooms',
    example: '2026-12-15',
  })
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'checkIn must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  checkIn?: string;

  @ApiPropertyOptional({
    description: 'Optional check-out date (YYYY-MM-DD). Give both dates to see the free rooms',
    example: '2026-12-18',
  })
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'checkOut must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  checkOut?: string;
}