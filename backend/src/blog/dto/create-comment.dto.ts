import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { COMMENT_MAX_LENGTH } from '../blog.constants';

/** BLG-05: the text is required, not empty, at most 500 characters. */
export class CreateCommentDto {
  @ApiProperty({
    maxLength: COMMENT_MAX_LENGTH,
    example: 'Great tips, thank you!',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(COMMENT_MAX_LENGTH)
  text!: string;
}