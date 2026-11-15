import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class CommentIdParamDto {
  @ApiProperty({ description: 'Comment id' })
  @IsMongoId()
  id!: string;
}