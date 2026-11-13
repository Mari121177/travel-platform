import { PartialType } from '@nestjs/swagger';
import { CreateHotelDto } from './create-hotel.dto';

// HTL-01: moderator edits their hotel. Same fields and rules, all optional.
export class UpdateHotelDto extends PartialType(CreateHotelDto) {}
