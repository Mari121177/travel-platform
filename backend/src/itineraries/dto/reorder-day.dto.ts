import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsMongoId, Max, Min } from 'class-validator';
import { MAX_ITINERARY_DAYS } from '../itinerary.constants';

/** ITN-08: move one day to a new position. */
export class ReorderDayDto {
  @ApiProperty({ description: 'Id of the day to move' })
  @IsMongoId()
  dayId!: string;

  @ApiProperty({
    example: 1,
    minimum: 1,
    maximum: MAX_ITINERARY_DAYS,
    description: 'New day number (1 = first day)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_ITINERARY_DAYS)
  position!: number;
}
