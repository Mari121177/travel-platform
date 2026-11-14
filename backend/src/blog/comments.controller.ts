import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CommentsService } from './comments.service';
import { CommentIdParamDto } from './dto/comment-id-param.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PostIdParamDto } from './dto/post-id-param.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

// BLG-05, BLG-07. Registered Users only (@Roles). The author is always the
// logged-in user: the id comes from the session, never from the request body.
@ApiTags('Blog')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'Not logged in, or the session expired' })
@Roles(Role.User)
@ApiForbiddenResponse({ description: 'Only registered users can use comments' })
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('posts/:id/comments')
  @ApiOperation({ summary: 'BLG-05: comment on a published post' })
  @ApiCreatedResponse({ description: 'The created comment' })
  @ApiBadRequestResponse({
    description: 'Text empty, longer than 500 characters, or an unknown field',
  })
  @ApiNotFoundResponse({ description: 'Post not found, or not published' })
  create(
    @CurrentUser('id') userId: string,
    @Param() params: PostIdParamDto,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(userId, params.id, dto);
  }

  @Patch('comments/:id')
  @ApiOperation({ summary: 'BLG-07: edit my comment' })
  @ApiOkResponse({ description: 'The updated comment' })
  @ApiBadRequestResponse({ description: 'Text empty or longer than 500 characters' })
  @ApiForbiddenResponse({ description: "Someone else's comment" })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  update(
    @CurrentUser('id') userId: string,
    @Param() params: CommentIdParamDto,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.update(userId, params.id, dto);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'BLG-07: delete my comment' })
  @ApiOkResponse({ description: 'Returns { deleted: true, id }' })
  @ApiForbiddenResponse({ description: "Someone else's comment" })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  remove(@CurrentUser('id') userId: string, @Param() params: CommentIdParamDto) {
    return this.commentsService.remove(userId, params.id);
  }
}