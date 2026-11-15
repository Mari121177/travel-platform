import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PostPageQueryDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Page of comments (10 per page, oldest first)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  commentsPage?: number = 1;
}
