import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, Matches } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// GET /hotels/:id/availability?from=YYYY-MM-DD&to=YYYY-MM-DD  (HTL-08)
export class AvailabilityQueryDto {
  @ApiProperty({ description: 'First night to show (YYYY-MM-DD)', example: '2026-12-01' })
  @Matches(DATE_REGEX, { message: 'from must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  from: string;

  @ApiProperty({
    description: 'Last night to show (YYYY-MM-DD), at most 31 nights after "from"',
    example: '2026-12-10',
  })
  @Matches(DATE_REGEX, { message: 'to must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  to: string;
}