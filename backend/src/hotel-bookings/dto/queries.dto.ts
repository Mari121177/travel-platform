import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { BookingStatus } from '../hotel-booking.constants';

export class PageQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;
}

export enum BookingGroup {
  Upcoming = 'upcoming',
  Past = 'past',
  Cancelled = 'cancelled',
}

export class ListBookingsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: BookingGroup, description: 'HTL-20 grouping' })
  @IsOptional()
  @IsEnum(BookingGroup)
  group?: BookingGroup;
}

export class ListReservationsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
