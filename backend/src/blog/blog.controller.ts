import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
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
import { BlogService } from './blog.service';
import { CreatePostDto } from './dto/create-post.dto';
import { ListMyPostsQueryDto } from './dto/list-my-posts-query.dto';
import { PostIdParamDto } from './dto/post-id-param.dto';
import { UpdatePostDto } from './dto/update-post.dto';

// BLG-01, BLG-03, BLG-04. Registered Users only (@Roles). The author
// is always the logged-in user: the id comes from the session, never from the
// request body.
@ApiTags('Blog')
@ApiCookieAuth()
@ApiUnauthorizedResponse({
  description: 'Not logged in, or the session expired',
})
@Roles(Role.User)
@ApiForbiddenResponse({
  description: 'Only registered users can use blog posts',
})
@Controller('posts')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  @ApiOperation({
    summary: 'BLG-01: create a post (draft by default, or published)',
  })
  @ApiCreatedResponse({ description: 'The created post' })
  @ApiBadRequestResponse({
    description:
      'Title or body missing, more than 5 tags, a tag over 30 characters, more than 5 images, an image URL that did not come from the upload endpoint, or an unknown field',
  })
  create(@CurrentUser('id') userId: string, @Body() dto: CreatePostDto) {
    return this.blogService.create(userId, dto);
  }

  // Declared before any ":id" route so "mine" is never read as an id
  @Get('mine')
  @ApiOperation({
    summary: 'BLG-03: my posts, drafts included (newest first, 10 per page)',
  })
  @ApiOkResponse({
    description:
      'Returns { items, page, limit, total, totalPages }. Each item has title, status, createdAt, publishedAt, likeCount and commentCount',
  })
  @ApiBadRequestResponse({ description: 'Invalid query' })
  findMine(
    @CurrentUser('id') userId: string,
    @Query() query: ListMyPostsQueryDto,
  ) {
    return this.blogService.findMine(userId, query);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'BLG-04: edit my post (only the fields sent change)',
  })
  @ApiOkResponse({ description: 'The updated post' })
  @ApiBadRequestResponse({ description: 'A field is invalid or null' })
  @ApiForbiddenResponse({ description: "Someone else's published post" })
  @ApiNotFoundResponse({ description: "Not found, or someone else's draft" })
  update(
    @CurrentUser('id') userId: string,
    @Param() params: PostIdParamDto,
    @Body() dto: UpdatePostDto,
  ) {
    return this.blogService.update(userId, params.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'BLG-04: delete my post' })
  @ApiOkResponse({ description: 'Returns { deleted: true, id }' })
  @ApiForbiddenResponse({ description: "Someone else's published post" })
  @ApiNotFoundResponse({ description: "Not found, or someone else's draft" })
  remove(@CurrentUser('id') userId: string, @Param() params: PostIdParamDto) {
    return this.blogService.remove(userId, params.id);
  }
}
