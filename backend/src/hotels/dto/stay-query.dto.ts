import { IsISO8601, IsOptional, Matches } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/hotels/:id/rooms/available?checkIn=&checkOut=  (HTL-15)
export class StayQueryDto {
  @Matches(DATE_REGEX, { message: 'checkIn must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  checkIn: string;

  @Matches(DATE_REGEX, { message: 'checkOut must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  checkOut: string;
}

// GET /api/hotels/:id?checkIn=&checkOut=  (HTL-02: dates are optional)
export class OptionalStayQueryDto {
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'checkIn must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  checkIn?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'checkOut must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  checkOut?: string;
}