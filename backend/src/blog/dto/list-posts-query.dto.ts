import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { POST_TAG_MAX_LENGTH } from '../blog.constants';
import { POST_SEARCH_MAX_LENGTH } from '../public-blog.constants';

// An empty value ("?q=") is the same as not sending it
const trimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

const lowerTrimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() || undefined : value;

export class ListPostsQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 'egypt',
    description: 'Only posts with this tag (BLG-02)',
  })
  @IsOptional()
  @Transform(lowerTrimmed)
  @IsString()
  @IsNotEmpty()
  @MaxLength(POST_TAG_MAX_LENGTH)
  tag?: string;

  @ApiPropertyOptional({
    example: 'pyramids',
    description:
      'Search words in the title, tags or author name (BLG-09). Results are ordered by likes plus comments, then newest first.',
  })
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @IsNotEmpty()
  @MaxLength(POST_SEARCH_MAX_LENGTH)
  q?: string;
}
