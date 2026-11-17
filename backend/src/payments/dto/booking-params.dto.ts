import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId } from 'class-validator';
import { BookingType } from '../enums/payment.enums';

/** Path params of /api/bookings/:type/:id/... */
export class BookingParamsDto {
  @ApiProperty({ enum: BookingType, description: 'flight or hotel' })
  @IsEnum(BookingType)
  type!: BookingType;

  @ApiProperty({ description: 'Flight booking or hotel reservation id' })
  @IsMongoId()
  id!: string;
}
