import { IsIn, IsISO8601, Matches } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// start = first night, end = LAST NIGHT (inclusive), NOT the check-out day.
// Checked in the SERVICE (needs both fields / the database):
//   - start <= end
//   - no overlap with other ranges of the same kind (HTL-04)
//   - blocked ranges can't overlap Confirmed / Pending Payment reservations (HTL-06)
export class DateRangeDto {
  @IsIn(['available', 'blocked'])
  kind: 'available' | 'blocked';

  @Matches(DATE_REGEX, { message: 'start must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  start: string;

  @Matches(DATE_REGEX, { message: 'end must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  end: string;
}
