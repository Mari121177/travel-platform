import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PostStatus } from '../post-status.enum';

/** Page size is fixed at 10 (GEN-05). */
export class ListMyPostsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    enum: Object.values(PostStatus),
    description: 'Only drafts or only published posts. Leave empty for both.',
  })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;
}