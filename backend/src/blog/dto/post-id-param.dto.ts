import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class PostIdParamDto {
  @ApiProperty({ description: 'Post id' })
  @IsMongoId()
  id!: string;
}
