import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';
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


export class ListFavoritesQueryDto {
  @ApiProperty({ default: 1, minimum: 1, maximum: 100000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page: number = 1;
}
