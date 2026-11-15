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
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { ListItinerariesQueryDto } from './dto/list-itineraries-query.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';
import { ItinerariesService } from './itineraries.service';

@ApiTags('Itineraries')
@ApiCookieAuth('access_token')
@Controller('itineraries')
export class ItinerariesController {
  constructor(private readonly itinerariesService: ItinerariesService) {}

  @Post()
  @Roles(Role.User)
  @ApiOperation({ summary: 'Create an itinerary (ITN-01)' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateItineraryDto) {
    return this.itinerariesService.create(userId, dto);
  }

  @Get()
  @Roles(Role.User)
  @ApiOperation({ summary: 'List my itineraries (ITN-03)' })
  findMine(
    @CurrentUser('id') userId: string,
    @Query() query: ListItinerariesQueryDto,
  ) {
    return this.itinerariesService.findMine(userId, query);
  }

  // NOTE: when you add GET /itineraries/public/search (ITN-20), declare it
  // ABOVE this route, otherwise ":id" will swallow "public".
  @Get(':id')
  @Roles(Role.User)
  @ApiOperation({
    summary: 'Get one itinerary; private ones are owner-only (ITN-03)',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.itinerariesService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.User)
  @ApiOperation({ summary: 'Edit my itinerary (ITN-01, ITN-20)' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateItineraryDto,
  ) {
    return this.itinerariesService.update(id, user, dto);
  }

  @Delete(':id')
  @Roles(Role.User)
  @ApiOperation({ summary: 'Delete my itinerary (ITN-01)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.itinerariesService.remove(id, user);
  }
}
