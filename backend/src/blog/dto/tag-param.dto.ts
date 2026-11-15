import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { POST_TAG_MAX_LENGTH } from '../blog.constants';

// Tags are saved in lower case (BLG-08), so the tag in the URL is too
export class TagParamDto {
  @ApiProperty({ example: 'egypt' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(POST_TAG_MAX_LENGTH)
  tag!: string;
}
