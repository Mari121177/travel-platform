import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query,
} from '@nestjs/common';
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
import { UpdateRoomDto } from './dto/update-room.dto';
import { DateRangeDto } from './dto/date-range.dto';
import { UpdateDateRangeDto } from './dto/update-date-range.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';

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

  // NEW (calendars) — GET /api/hotels/:id/availability?from=&to=  (HTL-08)
  @Roles(Role.HotelModerator)
  @Get(':id/availability')
  availabilityView(
    @Param('id') id: string,
    @Query() query: AvailabilityQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.hotelsService.getAvailabilityView(id, query.from, query.to, user);
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

  // PATCH /api/hotels/:id/rooms/:roomId  (HTL-05, HTL-06) — edit or deactivate
  @Roles(Role.HotelModerator)
  @Patch(':id/rooms/:roomId')
  updateRoom(
    @Param('id') id: string,
    @Param('roomId') roomId: string,
    @Body() dto: UpdateRoomDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.hotelsService.updateRoom(id, roomId, dto, user);
  }

  // DELETE /api/hotels/:id/rooms/:roomId  (HTL-06) — only never-reserved rooms
  @Roles(Role.HotelModerator)
  @Delete(':id/rooms/:roomId')
  @HttpCode(204)
  deleteRoom(
    @Param('id') id: string,
    @Param('roomId') roomId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.hotelsService.deleteRoom(id, roomId, user);
  }

  // NEW (calendars) — POST /api/hotels/:id/rooms/:roomId/availability  (HTL-04, HTL-06)
  @Roles(Role.HotelModerator)
  @Post(':id/rooms/:roomId/availability')
  addRange(
    @Param('id') id: string,
    @Param('roomId') roomId: string,
    @Body() dto: DateRangeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.hotelsService.addRange(id, roomId, dto, user);
  }

  // NEW (calendars) — PATCH /api/hotels/:id/rooms/:roomId/availability/:rangeId  (HTL-05, HTL-06)
  @Roles(Role.HotelModerator)
  @Patch(':id/rooms/:roomId/availability/:rangeId')
  updateRange(
    @Param('id') id: string,
    @Param('roomId') roomId: string,
    @Param('rangeId') rangeId: string,
    @Body() dto: UpdateDateRangeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.hotelsService.updateRange(id, roomId, rangeId, dto, user);
  }

  // NEW (calendars) — DELETE /api/hotels/:id/rooms/:roomId/availability/:rangeId  (HTL-05, HTL-06)
  @Roles(Role.HotelModerator)
  @Delete(':id/rooms/:roomId/availability/:rangeId')
  removeRange(
    @Param('id') id: string,
    @Param('roomId') roomId: string,
    @Param('rangeId') rangeId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.hotelsService.removeRange(id, roomId, rangeId, user);
  }
}