import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ListPostsQueryDto } from './dto/list-posts-query.dto';
import { PostIdParamDto } from './dto/post-id-param.dto';
import { PageQueryDto } from './dto/page-query.dto';
import { PostPageQueryDto } from './dto/post-page-query.dto';
import { TagParamDto } from './dto/tag-param.dto';
import { PublicBlogService } from './public-blog.service';

// BLG-02, BLG-08, BLG-09. Open to guests. Declared AFTER BlogController in the
// module, so "GET /posts/mine" is matched before "GET /posts/:id".
@ApiTags('Blog')
@Public()
@Controller('posts')
export class PublicBlogController {
  constructor(private readonly publicBlogService: PublicBlogService) {}

  @Get()
  @ApiOperation({
    summary:
      'BLG-02, BLG-09: published posts (10 per page), filter by tag or search by keyword',
  })
  @ApiOkResponse({
    description:
      'Returns { items, page, limit, total, totalPages }. Each item has title, excerpt, tags, publishedAt, likeCount, commentCount, coverImage and author { _id, name }. A search with no match also has message: "No results".',
  })
  @ApiBadRequestResponse({ description: 'Invalid page, tag or search' })
  list(@Query() query: ListPostsQueryDto) {
    return this.publicBlogService.list(query);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'BLG-02: the post page with its comments (oldest first, 10 per page)',
  })
  @ApiOkResponse({
    description:
      'The post with its author, like count, likedByMe (false for guests) and comments { items, page, limit, total, totalPages }',
  })
  @ApiNotFoundResponse({
    description:
      "Not found, a draft that is not yours, or the author's account was deactivated",
  })
  findOne(
    @Param() params: PostIdParamDto,
    @Query() query: PostPageQueryDto,
    @CurrentUser('id') userId: string | undefined,
  ) {
    return this.publicBlogService.findOne(
      params.id,
      userId,
      query.commentsPage,
    );
  }
}

// BLG-08: the posts that carry a tag
@ApiTags('Blog')
@Public()
@Controller('tags')
export class TagsController {
  constructor(private readonly publicBlogService: PublicBlogService) {}

  @Get(':tag/posts')
  @ApiOperation({
    summary: 'BLG-08: published posts with this tag (10 per page)',
  })
  @ApiOkResponse({
    description: 'Returns { tag, items, page, limit, total, totalPages }',
  })
  @ApiBadRequestResponse({ description: 'Invalid tag or page' })
  listByTag(@Param() params: TagParamDto, @Query() query: PageQueryDto) {
    return this.publicBlogService.listByTag(params.tag, query.page);
  }
}
