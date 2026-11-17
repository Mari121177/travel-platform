import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsMongoId } from 'class-validator';
import { ModeratorType } from './create-moderator.dto';

// ACC-15: :type is the provider kind, :id is the hotel or airline id.
export class ProviderParamsDto {
  @ApiProperty({
    enum: Object.values(ModeratorType),
    example: 'hotel',
  })
  @IsIn(Object.values(ModeratorType))
  type!: ModeratorType;

  @ApiProperty({ description: 'Hotel or airline id' })
  @IsMongoId({ message: 'id must be a valid provider id' })
  id!: string;
}
