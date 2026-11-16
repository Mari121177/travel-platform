import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { AuthorsService } from './authors.service';
import { AuthorIdParamDto } from './dto/author-id-param.dto';
import { AuthorPageQueryDto } from './dto/author-page-query.dto';

// BLG-12. Open to guests.
@ApiTags('Blog')
@Public()
@Controller('authors')
export class AuthorsController {
  constructor(private readonly authorsService: AuthorsService) {}

  @Get(':id')
  @ApiOperation({
    summary:
      'BLG-12: public author page with name, join date, published posts and public itineraries (10 per page each)',
  })
  @ApiOkResponse({
    description:
      'Returns { author { _id, name, joinedAt }, posts { items, page, limit, total, totalPages }, itineraries { items, page, limit, total, totalPages } }',
  })
  @ApiBadRequestResponse({ description: 'Invalid id or page' })
  @ApiNotFoundResponse({
    description: 'No such author, or the account was deactivated (ACC-12)',
  })
  getPage(
    @Param() params: AuthorIdParamDto,
    @Query() query: AuthorPageQueryDto,
  ) {
    return this.authorsService.getPage(params.id, query);
  }
}
