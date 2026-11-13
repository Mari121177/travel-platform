import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

// HTL-03: POST /api/hotels/:id/rooms
// hotelId comes from the URL (:id), NOT from the body.
export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  roomNumber: string; // unique within the hotel (DB index)

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  type: string; // e.g. "Single", "Double", "Suite"

  @IsInt()
  @Min(1)
  beds: number;

  @IsInt()
  @Min(1)
  maxOccupancy: number; // >= 1

  @IsNumber()
  @IsPositive()
  pricePerNight: number; // > 0
}
