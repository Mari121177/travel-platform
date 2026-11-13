import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsMongoId,
  IsOptional,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class BookingRoomDto {
  @ApiProperty({ example: '665f1c2e8b3a4d0012a3b4c5' })
  @IsMongoId()
  roomId: string;

  @ApiProperty({ example: 2, minimum: 0 })
  @IsInt()
  @Min(0)
  adults: number;

  @ApiProperty({ type: [Number], example: [5, 9], required: false, description: 'Ages 0-17' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(17, { each: true })
  childrenAges?: number[];
}

export class CreateHotelBookingDto {
  @ApiProperty({ example: '665f1c2e8b3a4d0012a3b4aa' })
  @IsMongoId()
  hotelId: string;

  @ApiProperty({ example: '2026-12-01', description: 'YYYY-MM-DD, not in the past' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'checkIn must be YYYY-MM-DD' })
  checkIn: string;

  @ApiProperty({ example: '2026-12-04', description: 'YYYY-MM-DD, after checkIn (exclusive)' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'checkOut must be YYYY-MM-DD' })
  checkOut: string;

  @ApiProperty({ type: [BookingRoomDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => BookingRoomDto)
  rooms: BookingRoomDto[];
}
