import { CreateCommentDto } from './create-comment.dto';

/** BLG-07: editing a comment replaces its text, with the same rules as BLG-05. */
export class UpdateCommentDto extends CreateCommentDto {}
