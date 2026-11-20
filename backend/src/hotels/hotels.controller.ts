import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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

// Shared texts for the path boxes and the login errors
const HOTEL_ID = { name: 'id', description: 'Hotel id' };
const ROOM_ID = { name: 'roomId', description: 'Room id (must belong to this hotel)' };
const RANGE_ID = { name: 'rangeId', description: 'Id of an open or blocked date range of this room' };
const NOT_LOGGED_IN = { description: 'Not logged in, or the session expired' };
const NOT_YOUR_HOTEL = { description: 'Hotel moderators only, and only for their own hotel' };

@ApiTags('Hotels')
@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Roles(Role.Admin)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'HTL-01: admin creates a hotel (country is taken from the city)' })
  @ApiCreatedResponse({ description: 'The new hotel, with countryCode filled in from the city' })
  @ApiBadRequestResponse({
    description: 'Invalid fields, unknown cityId, or a photo not uploaded through /api/uploads/images',
  })
  @ApiUnauthorizedResponse(NOT_LOGGED_IN)
  @ApiForbiddenResponse({ description: 'Admins only' })
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
  @ApiOkResponse({
    description:
      'Returns { data, total, page, limit }. Each hotel shows the cheapest free room price for the stay',
  })
  @ApiBadRequestResponse({
    description:
      'No city or country, invalid dates, check-in in the past, min price above max price, or more rooms than guests',
  })
  @Get('search')
  search(@Query() query: SearchHotelsDto) {
    return this.hotelsService.searchHotels(query);
  }

  @Public()
  @ApiOperation({
    summary: 'HTL-02: hotel details. With checkIn and checkOut, also lists the available rooms',
  })
  @ApiParam(HOTEL_ID)
  @ApiOkResponse({
    description: 'The hotel. With both dates, also nights and availableRooms (with total price)',
  })
  @ApiBadRequestResponse({ description: 'Invalid hotel id or dates, or only one of the two dates given' })
  @ApiNotFoundResponse({ description: 'Hotel not found or deactivated' })
  @Get(':id')
  findOne(@Param('id') id: string, @Query() query: OptionalStayQueryDto) {
    return this.hotelsService.getHotelDetails(id, query.checkIn, query.checkOut);
  }

  @Public()
  @ApiOperation({ summary: 'HTL-15: rooms free for the whole stay, with the total price' })
  @ApiParam(HOTEL_ID)
  @ApiOkResponse({
    description: 'Returns { hotelId, checkIn, checkOut, nights, rooms }, cheapest room first',
  })
  @ApiBadRequestResponse({ description: 'Invalid hotel id, invalid dates, or check-in in the past' })
  @ApiNotFoundResponse({ description: 'Hotel not found or deactivated' })
  @Get(':id/rooms/available')
  availableRooms(@Param('id') id: string, @Query() query: StayQueryDto) {
    return this.hotelsService.getAvailableRooms(id, query.checkIn, query.checkOut);
  }

  @Roles(Role.HotelModerator)
  @ApiCookieAuth()
  @ApiOperation({ summary: "HTL-01: moderator edits their hotel's profile" })
  @ApiParam(HOTEL_ID)
  @ApiOkResponse({ description: 'The updated hotel' })
  @ApiBadRequestResponse({
    description: 'Invalid hotel id, invalid fields, unknown cityId, or a field that cannot be changed',
  })
  @ApiUnauthorizedResponse(NOT_LOGGED_IN)
  @ApiForbiddenResponse(NOT_YOUR_HOTEL)
  @ApiNotFoundResponse({ description: 'Hotel not found' })
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
  @ApiParam(HOTEL_ID)
  @ApiOkResponse({ description: 'The hotel with its new policies (tiers sorted, highest daysBefore first)' })
  @ApiBadRequestResponse({
    description: 'Times not HH:mm, refundPercent outside 0-100, or two tiers with the same daysBefore',
  })
  @ApiUnauthorizedResponse(NOT_LOGGED_IN)
  @ApiForbiddenResponse(NOT_YOUR_HOTEL)
  @ApiNotFoundResponse({ description: 'Hotel not found' })
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
  @ApiParam(HOTEL_ID)
  @ApiOkResponse({
    description: 'Every room with one entry per night. Booked nights include the booking reference',
  })
  @ApiBadRequestResponse({ description: 'Invalid dates, "to" before "from", or more than 31 nights' })
  @ApiUnauthorizedResponse(NOT_LOGGED_IN)
  @ApiForbiddenResponse(NOT_YOUR_HOTEL)
  @ApiNotFoundResponse({ description: 'Hotel not found' })
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
  @ApiParam(HOTEL_ID)
  @ApiCreatedResponse({ description: 'The new room (active, with no date ranges yet)' })
  @ApiBadRequestResponse({ description: 'Invalid fields: beds, occupancy and price must be positive' })
  @ApiUnauthorizedResponse(NOT_LOGGED_IN)
  @ApiForbiddenResponse(NOT_YOUR_HOTEL)
  @ApiNotFoundResponse({ description: 'Hotel not found' })
  @ApiConflictResponse({ description: 'This room number already exists in the hotel' })
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
  @ApiParam(HOTEL_ID)
  @ApiParam(ROOM_ID)
  @ApiOkResponse({ description: 'The updated room. Existing reservations keep their old price' })
  @ApiBadRequestResponse({ description: 'Invalid id or fields' })
  @ApiUnauthorizedResponse(NOT_LOGGED_IN)
  @ApiForbiddenResponse(NOT_YOUR_HOTEL)
  @ApiNotFoundResponse({ description: 'Hotel not found, or room not found in this hotel' })
  @ApiConflictResponse({
    description: 'Deactivating a room that has upcoming Confirmed or Pending Payment reservations',
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
  @ApiParam(HOTEL_ID)
  @ApiParam(ROOM_ID)
  @ApiNoContentResponse({ description: 'Room deleted' })
  @ApiBadRequestResponse({ description: 'Invalid id' })
  @ApiUnauthorizedResponse(NOT_LOGGED_IN)
  @ApiForbiddenResponse(NOT_YOUR_HOTEL)
  @ApiNotFoundResponse({ description: 'Hotel not found, or room not found in this hotel' })
  @ApiConflictResponse({ description: 'The room has reservations. Deactivate it instead' })
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
  @ApiParam(HOTEL_ID)
  @ApiParam(ROOM_ID)
  @ApiCreatedResponse({ description: 'The room with its updated ranges' })
  @ApiBadRequestResponse({ description: 'Invalid dates, end before start, or dates in the past' })
  @ApiUnauthorizedResponse(NOT_LOGGED_IN)
  @ApiForbiddenResponse(NOT_YOUR_HOTEL)
  @ApiNotFoundResponse({ description: 'Hotel not found, or room not found in this hotel' })
  @ApiConflictResponse({
    description:
      'Overlaps another range of the same kind, or blocks nights that have Confirmed or Pending Payment reservations',
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
  @ApiParam(HOTEL_ID)
  @ApiParam(ROOM_ID)
  @ApiParam(RANGE_ID)
  @ApiOkResponse({ description: 'The room with its updated ranges' })
  @ApiBadRequestResponse({ description: 'Invalid id or dates, end before start, or dates in the past' })
  @ApiUnauthorizedResponse(NOT_LOGGED_IN)
  @ApiForbiddenResponse(NOT_YOUR_HOTEL)
  @ApiNotFoundResponse({ description: 'Hotel, room or range not found' })
  @ApiConflictResponse({
    description:
      'Overlaps another range, removes open nights that have Confirmed reservations, or blocks nights that have reservations',
  })
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
  @ApiParam(HOTEL_ID)
  @ApiParam(ROOM_ID)
  @ApiParam(RANGE_ID)
  @ApiOkResponse({ description: 'The room without that range' })
  @ApiBadRequestResponse({ description: 'Invalid id' })
  @ApiUnauthorizedResponse(NOT_LOGGED_IN)
  @ApiForbiddenResponse(NOT_YOUR_HOTEL)
  @ApiNotFoundResponse({ description: 'Hotel, room or range not found' })
  @ApiConflictResponse({ description: 'This open range has Confirmed reservations and must stay' })
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