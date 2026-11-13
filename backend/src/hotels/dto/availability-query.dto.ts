import { IsISO8601, Matches } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// GET /hotels/:id/availability?from=YYYY-MM-DD&to=YYYY-MM-DD  (HTL-08)
export class AvailabilityQueryDto {
  @Matches(DATE_REGEX, { message: 'from must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  from: string;

  @Matches(DATE_REGEX, { message: 'to must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  to: string;
}