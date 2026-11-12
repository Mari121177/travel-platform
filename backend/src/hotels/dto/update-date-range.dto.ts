import { PartialType, PickType } from '@nestjs/swagger';
import { DateRangeDto } from './date-range.dto';

// PATCH a range: change start and/or end. The kind (available/blocked) can't change.
export class UpdateDateRangeDto extends PartialType(
  PickType(DateRangeDto, ['start', 'end'] as const),
) {}