import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
import { SearchHotelsDto } from './dto/search-hotels.dto';
import { OptionalStayQueryDto, StayQueryDto } from './dto/stay-query.dto';

@ApiTags('Hotels')
@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Roles(Role.Admin)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'HTL-01: admin creates a hotel (country is taken from the city)' })
  @Post()
  create(@Body() dto: CreateHotelDto) {
    return this.hotelsService.createHotel(dto);
  }

  // MUST stay ABOVE GET ':id', otherwise "search" would be read as an id.
  @Public()
  @ApiOperation({
    summary:
      'HTL-11, HTL-12: search hotels by city or country, dates, guests and rooms; filter by price and rating; sort by price or rating; 10 per page',
  })
  @Get('search')
  search(@Query() query: SearchHotelsDto) {
    return this.hotelsService.searchHotels(query);
  }

  @Public()
  @ApiOperation({
    summary: 'HTL-02: hotel details. With checkIn and checkOut, also lists the available rooms',
  })
  @Get(':id')
  findOne(@Param('id') id: string, @Query() query: OptionalStayQueryDto) {
    return this.hotelsService.getHotelDetails(id, query.checkIn, query.checkOut);
  }

  @Public()
  @ApiOperation({ summary: 'HTL-15: rooms free for the whole stay, with the total price' })
  @Get(':id/rooms/available')
  availableRooms(@Param('id') id: string, @Query() query: StayQueryDto) {
    return this.hotelsService.getAvailableRooms(id, query.checkIn, query.checkOut);
  }

  @Roles(Role.HotelModerator)
  @ApiCookieAuth()
  @ApiOperation({ summary: "HTL-01: moderator edits their hotel's profile" })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHotelDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.hotelsService.updateHotel(id, dto, user);
  }

  @Roles(Role.HotelModerator)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'HTL-09, HTL-10: set check-in/check-out times and cancellation tiers' })
  @Put(':id/policies')
  updatePolicies(
    @Param('id') id: string,
    @Body() dto: UpdateHotelPoliciesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.hotelsService.updatePolicies(id, dto, user);
  }

  @Roles(Role.HotelModerator)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'HTL-08: status of every room per night (Available / Booked / Blocked), max 31 nights',
  })
  @Get(':id/availability')
  availabilityView(
    @Param('id') id: string,
    @Query() query: AvailabilityQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.hotelsService.getAvailabilityView(id, query.from, query.to, user);
  }

  @Roles(Role.HotelModerator)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'HTL-03: add a room (room number must be unique in the hotel)' })
  @Post(':id/rooms')
  createRoom(
    @Param('id') id: string,
    @Body() dto: CreateRoomDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.hotelsService.createRoom(id, dto, user);
  }

  @Roles(Role.HotelModerator)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'HTL-05, HTL-06: edit beds, occupancy or price, or deactivate the room (409 if it has upcoming reservations)',
  })
  @Patch(':id/rooms/:roomId')
  updateRoom(
    @Param('id') id: string,
    @Param('roomId') roomId: string,
    @Body() dto: UpdateRoomDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.hotelsService.updateRoom(id, roomId, dto, user);
  }

  @Roles(Role.HotelModerator)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'HTL-06: delete a room that was never reserved (otherwise 409: deactivate it instead)',
  })
  @Delete(':id/rooms/:roomId')
  @HttpCode(204)
  deleteRoom(
    @Param('id') id: string,
    @Param('roomId') roomId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.hotelsService.deleteRoom(id, roomId, user);
  }

  @Roles(Role.HotelModerator)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'HTL-04, HTL-06: add an open (available) or blocked date range. end = last night, inclusive',
  })
  @Post(':id/rooms/:roomId/availability')
  addRange(
    @Param('id') id: string,
    @Param('roomId') roomId: string,
    @Body() dto: DateRangeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.hotelsService.addRange(id, roomId, dto, user);
  }

  @Roles(Role.HotelModerator)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'HTL-05, HTL-06: move or resize a date range' })
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

  @Roles(Role.HotelModerator)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'HTL-05, HTL-06: remove a date range' })
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