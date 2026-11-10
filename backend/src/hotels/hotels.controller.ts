import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { HotelsService } from './hotels.service';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { UpdateHotelPoliciesDto } from './dto/update-hotel-policies.dto';
import { CreateRoomDto } from './dto/create-room.dto';

@ApiTags('Hotels')
@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  // POST /api/hotels  (HTL-01) — admin creates a hotel
  @Roles(Role.Admin)
  @Post()
  create(@Body() dto: CreateHotelDto) {
    return this.hotelsService.createHotel(dto);
  }

  // GET /api/hotels/:id  (HTL-02) — anyone can view
  // NOTE: when we add GET 'search', it must go ABOVE this route,
  // otherwise "search" would be treated as an :id.
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.hotelsService.findHotelById(id);
  }

  // PATCH /api/hotels/:id  (HTL-01) — moderator edits their hotel
  @Roles(Role.HotelModerator)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHotelDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.hotelsService.updateHotel(id, dto, user);
  }

  // PUT /api/hotels/:id/policies  (HTL-09, HTL-10)
  @Roles(Role.HotelModerator)
  @Put(':id/policies')
  updatePolicies(
    @Param('id') id: string,
    @Body() dto: UpdateHotelPoliciesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.hotelsService.updatePolicies(id, dto, user);
  }

  // POST /api/hotels/:id/rooms  (HTL-03)
  @Roles(Role.HotelModerator)
  @Post(':id/rooms')
  createRoom(
    @Param('id') id: string,
    @Body() dto: CreateRoomDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.hotelsService.createRoom(id, dto, user);
  }
}
