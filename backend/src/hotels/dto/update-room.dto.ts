import { PartialType, PickType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateRoomDto } from './create-room.dto';

// HTL-05: edit beds, occupancy, price. HTL-06: deactivate/reactivate.
// Deactivating is rejected in the SERVICE if it overlaps a
// Confirmed or Pending Payment reservation.
export class UpdateRoomDto extends PartialType(
  PickType(CreateRoomDto, ['beds', 'maxOccupancy', 'pricePerNight'] as const),
) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
