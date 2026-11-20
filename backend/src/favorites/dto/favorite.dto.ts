import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsMongoId } from 'class-validator';
import { FavoriteType } from '../schemas/favorite.schema';

export class CreateFavoriteDto {
  @ApiProperty({ enum: Object.values(FavoriteType), example: 'hotel' })
  @IsIn(Object.values(FavoriteType))
  type!: FavoriteType;

  @ApiProperty({ description: 'Hotel or public itinerary id' })
  @IsMongoId()
  targetId!: string;
}

export class FavoriteParamsDto {
  @ApiProperty({ enum: Object.values(FavoriteType), example: 'hotel' })
  @IsIn(Object.values(FavoriteType))
  type!: FavoriteType;

  @ApiProperty({ description: 'Hotel or public itinerary id' })
  @IsMongoId()
  targetId!: string;
}
