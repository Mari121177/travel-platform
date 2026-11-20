import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateFavoriteDto, FavoriteParamsDto, ListFavoritesQueryDto } from './dto/favorite.dto';
import { FavoritesService } from './favorites.service';

@ApiTags('Favourites')
@ApiCookieAuth()
@Roles(Role.User)
@ApiUnauthorizedResponse({ description: 'Not logged in, or the session expired' })
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly service: FavoritesService) {}

  @Post()
  @ApiOperation({
    summary: 'BON-02: save an active hotel or public itinerary to favourites',
  })
  @ApiCreatedResponse({ description: 'The saved favourite' })
  @ApiConflictResponse({ description: 'Already saved' })
  @ApiNotFoundResponse({ description: 'Hotel or public itinerary not found' })
  add(@CurrentUser('id') userId: string, @Body() dto: CreateFavoriteDto) {
    return this.service.add(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'BON-02: my favourites, newest first, 10 per page' })
  @ApiOkResponse({ description: 'Returns { items, total, page, limit, totalPages }' })
  list(
    @CurrentUser('id') userId: string,
    @Query() query: ListFavoritesQueryDto,
  ) {
    return this.service.list(userId, query);
  }

  @Delete(':type/:targetId')
  @ApiOperation({ summary: 'BON-02: remove one of my favourites' })
  @ApiOkResponse({ description: 'Returns { deleted: true }' })
  @ApiNotFoundResponse({ description: 'Favourite not found' })
  remove(
    @CurrentUser('id') userId: string,
    @Param() params: FavoriteParamsDto,
  ) {
    return this.service.remove(userId, params.type, params.targetId);
  }
}
