import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';

export const AdminBookingType = {
  All: 'all',
  Hotel: 'hotel',
  Flight: 'flight',
} as const;
export type AdminBookingType =
  (typeof AdminBookingType)[keyof typeof AdminBookingType];

export const AdminBookingStatusValues = [
  'PendingPayment',
  'Confirmed',
  'Expired',
  'Cancelled',
  'Completed',
] as const;

export class ListAdminBookingsQueryDto {
  @ApiPropertyOptional({
    enum: Object.values(AdminBookingType),
    default: AdminBookingType.All,
  })
  @IsOptional()
  @IsIn(Object.values(AdminBookingType))
  type: AdminBookingType = AdminBookingType.All;

  @ApiPropertyOptional({ enum: AdminBookingStatusValues })
  @IsOptional()
  @IsIn(AdminBookingStatusValues)
  status?: (typeof AdminBookingStatusValues)[number];

  @ApiPropertyOptional({ description: 'createdAt >= this date/date-time' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'createdAt <= this date/date-time' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ description: 'Travel start date (inclusive)' })
  @IsOptional()
  @IsISO8601()
  travelFrom?: string;

  @ApiPropertyOptional({ description: 'Travel end date (inclusive)' })
  @IsOptional()
  @IsISO8601()
  travelTo?: string;

  @ApiPropertyOptional({ default: 1, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  page: number = 1;
}
