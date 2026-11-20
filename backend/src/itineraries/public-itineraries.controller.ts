import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { PublicSearchQueryDto } from './dto/public-search-query.dto';
import { PublicItinerariesService } from './public-itineraries.service';

// Listed BEFORE ItinerariesController in the module, so "public" is matched
// here and never swallowed by ":id".
@ApiTags('Itineraries')
@Controller('itineraries')
export class PublicItinerariesController {
  constructor(private readonly publicService: PublicItinerariesService) {}

  @Public()
  @Get('public/search')
  @ApiOperation({
    summary:
      'Search public itineraries by keyword, duration, country or city (ITN-21)',
  })
  search(@Query() query: PublicSearchQueryDto) {
    return this.publicService.search(query);
  }

  @Public()
  @Get('public/:id')
  @ApiOperation({
    summary:
      'View a public itinerary read-only with author, days, activities and budget (ITN-21)',
  })
  findPublic(@Param('id') id: string) {
    return this.publicService.findPublic(id);
  }

  @Post(':id/clone')
  @Roles(Role.User)
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary:
      'Clone a public itinerary into my own private copy, crediting the author (ITN-21)',
  })
  clone(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.publicService.clone(id, user);
  }
}