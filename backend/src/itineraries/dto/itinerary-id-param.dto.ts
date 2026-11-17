import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class ItineraryIdParamDto {
  @ApiProperty({ description: 'Itinerary id' })
  @IsMongoId()
  id!: string;
}
