import { PartialType } from '@nestjs/swagger';
import { CreatePostDto } from './create-post.dto';

/** BLG-04: the author may change any field. Only the fields sent are changed. */
export class UpdatePostDto extends PartialType(CreatePostDto) {}
