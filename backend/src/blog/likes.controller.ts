import { Controller, Delete, Param, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
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
import { PostIdParamDto } from './dto/post-id-param.dto';
import { LikesService } from './likes.service';

// BLG-06. Registered Users only (@Roles). The user is always the logged-in
// user: the id comes from the session, never from the request.
@ApiTags('Blog')
@ApiCookieAuth()
@ApiUnauthorizedResponse({
  description: 'Not logged in, or the session expired',
})
@Roles(Role.User)
@ApiForbiddenResponse({ description: 'Only registered users can like posts' })
@Controller('posts')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post(':id/like')
  @ApiOperation({ summary: 'BLG-06: like a published post (once per user)' })
  @ApiCreatedResponse({ description: 'Returns { liked: true, likeCount }' })
  @ApiNotFoundResponse({ description: 'Post not found, or not published' })
  @ApiConflictResponse({ description: 'You already liked this post' })
  like(@CurrentUser('id') userId: string, @Param() params: PostIdParamDto) {
    return this.likesService.like(userId, params.id);
  }

  @Delete(':id/like')
  @ApiOperation({ summary: 'BLG-06: remove my like from a post' })
  @ApiOkResponse({ description: 'Returns { liked: false, likeCount }' })
  @ApiNotFoundResponse({ description: 'You have not liked this post' })
  unlike(@CurrentUser('id') userId: string, @Param() params: PostIdParamDto) {
    return this.likesService.unlike(userId, params.id);
  }
}
