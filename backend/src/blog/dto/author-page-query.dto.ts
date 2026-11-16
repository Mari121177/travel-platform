import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// BLG-12, GEN-05: the author page has two lists, each with its own page
export class AuthorPageQueryDto {
  @ApiPropertyOptional({ description: 'Page of published posts', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  postsPage?: number;

  @ApiPropertyOptional({
    description: 'Page of public itineraries',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  itinerariesPage?: number;
}
