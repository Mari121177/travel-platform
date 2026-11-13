import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  POST_BODY_MAX_LENGTH,
  POST_IMAGE_URL_REGEX,
  POST_MAX_IMAGES,
  POST_MAX_TAGS,
  POST_TAG_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
} from '../blog.constants';
import { PostStatus } from '../post-status.enum';

// Trims strings. Anything that is not a string is left alone so the
// validators below reject it with a clear message.
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Tags are saved trimmed and lower-case with duplicates removed, so
// "Cairo" and " cairo " count as one tag (BLG-08).
const normalizeTags = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.map((tag: unknown) =>
            typeof tag === 'string' ? tag.trim().toLowerCase() : tag,
          ),
        ),
      ]
    : value;

/** BLG-01: title and body are required. Tags and images are optional. */
export class CreatePostDto {
  @ApiProperty({ maxLength: POST_TITLE_MAX_LENGTH, example: '3 days in Cairo' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(POST_TITLE_MAX_LENGTH)
  title!: string;

  @ApiProperty({ maxLength: POST_BODY_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(POST_BODY_MAX_LENGTH)
  body!: string;

  @ApiPropertyOptional({
    type: [String],
    description: `At most ${POST_MAX_TAGS} tags, ${POST_TAG_MAX_LENGTH} characters each. Saved in lower case.`,
    example: ['egypt', 'food'],
  })
  @IsOptional()
  @Transform(normalizeTags)
  @IsArray()
  @ArrayMaxSize(POST_MAX_TAGS)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(POST_TAG_MAX_LENGTH, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: `At most ${POST_MAX_IMAGES} image URLs returned by POST /api/uploads/images`,
    example: ['/uploads/3f2b8a52-6b1e-4a4d-9d62-0f2b8e5f7c11.png'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(POST_MAX_IMAGES)
  @ArrayUnique()
  @Matches(POST_IMAGE_URL_REGEX, {
    each: true,
    message: 'each image must be a URL returned by the upload endpoint',
  })
  images?: string[];

  @ApiPropertyOptional({
    enum: Object.values(PostStatus),
    default: PostStatus.Draft,
  })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;
}