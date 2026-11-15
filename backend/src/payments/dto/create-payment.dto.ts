import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId } from 'class-validator';
import { BookingType } from '../enums/payment.enums';

/**
 * PAY-01: which booking to pay for.
 * The amount is NOT sent by the client: it is read from the booking on the server.
 */
export class CreatePaymentDto {
  @ApiProperty({ enum: BookingType, example: BookingType.HOTEL })
  @IsEnum(BookingType)
  bookingType!: BookingType;

  @ApiProperty({ description: 'Flight booking or hotel reservation id' })
  @IsMongoId()
  bookingId!: string;
}
