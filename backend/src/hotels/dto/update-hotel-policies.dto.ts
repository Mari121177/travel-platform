import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/; // "HH:mm", 24-hour

// One row of the refund table (HTL-10)
export class CancellationTierDto {
  @IsInt()
  @Min(0)
  daysBefore: number; // integer >= 0

  @IsNumber()
  @Min(0)
  @Max(100)
  refundPercent: number; // 0-100
}

// HTL-09 + HTL-10: PUT /api/hotels/:id/policies
export class UpdateHotelPoliciesDto {
  @IsOptional()
  @Matches(TIME_REGEX, { message: 'checkInTime must be HH:mm (24-hour)' })
  checkInTime?: string;

  @IsOptional()
  @Matches(TIME_REGEX, { message: 'checkOutTime must be HH:mm (24-hour)' })
  checkOutTime?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CancellationTierDto)
  @ArrayUnique((t: CancellationTierDto) => t.daysBefore, {
    message: 'Each cancellation tier must have a unique daysBefore',
  })
  cancellationTiers?: CancellationTierDto[];
}
