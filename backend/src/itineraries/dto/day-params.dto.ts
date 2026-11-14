import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class DayParamsDto {
  @ApiProperty({ description: 'Itinerary id' })
  @IsMongoId()
  id!: string;

  @ApiProperty({ description: 'Day id' })
  @IsMongoId()
  dayId!: string;
}
