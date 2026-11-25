import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
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
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { PageQueryDto } from './dto/queries.dto';
import { CreateReviewDto, ReplyReviewDto, UpdateReviewDto } from './dto/review.dto';
import { ParseObjectIdPipe } from './parse-object-id.pipe';
import { ReviewsService } from './reviews.service';

@ApiTags('Hotel Reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Post('hotel-bookings/:id/review')
  @Roles(Role.User)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'HTL-23: rate a Completed reservation (one review per reservation)' })
  @ApiCreatedResponse({ description: 'Review created; the hotel rating is recalculated' })
  @ApiBadRequestResponse({ description: 'Invalid rating or comment, or the stay has not ended yet' })
  @ApiUnauthorizedResponse({ description: 'Not logged in, or the session expired' })
  @ApiForbiddenResponse({ description: 'Registered users only' })
  @ApiNotFoundResponse({ description: 'Reservation not found, or it belongs to another user' })
  @ApiConflictResponse({ description: 'This reservation already has a review' })
  create(
    @CurrentUser('id') userId: string,
    @Param('id', ParseObjectIdPipe) bookingId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.service.create(userId, bookingId, dto);
  }

  @Patch('reviews/:id')
  @Roles(Role.User)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'HTL-23: edit my review' })
  @ApiOkResponse({ description: 'The updated review; the hotel rating is recalculated' })
  @ApiBadRequestResponse({ description: 'Invalid rating or comment, or malformed id' })
  @ApiUnauthorizedResponse({ description: 'Not logged in, or the session expired' })
  @ApiForbiddenResponse({ description: 'Registered users only' })
  @ApiNotFoundResponse({ description: 'Review not found, or it belongs to another user' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.service.update(userId, id, dto);
  }

  @Patch('reviews/:id/reply')
  @Roles(Role.HotelModerator)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'HTL-26: hotel moderator replies to a review of their hotel' })
  @ApiOkResponse({ description: 'The review with the moderator reply' })
  @ApiBadRequestResponse({ description: 'Invalid reply or malformed id' })
  @ApiUnauthorizedResponse({ description: 'Not logged in, or the session expired' })
  @ApiForbiddenResponse({ description: 'Hotel moderators only, and only for reviews of their own hotel' })
  @ApiNotFoundResponse({ description: 'Review not found' })
  reply(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.service.reply(id, user, dto);
  }

  @Delete('reviews/:id')
  @Roles(Role.User)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'HTL-23: delete my review' })
  @ApiOkResponse({ description: 'Deleted; the hotel rating is recalculated' })
  @ApiBadRequestResponse({ description: 'Malformed id' })
  @ApiUnauthorizedResponse({ description: 'Not logged in, or the session expired' })
  @ApiForbiddenResponse({ description: 'Registered users only' })
  @ApiNotFoundResponse({ description: 'Review not found, or it belongs to another user' })
  remove(@CurrentUser('id') userId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.remove(userId, id);
  }

  @Public()
  @Get('hotels/:id/reviews')
  @ApiOperation({ summary: 'HTL-24: rating summary + reviews (newest first, 10 per page)' })
  @ApiOkResponse({ description: 'Returns ratingAvg, ratingCount and { data, total, page, limit }' })
  @ApiBadRequestResponse({ description: 'Malformed id or invalid query' })
  list(@Param('id', ParseObjectIdPipe) hotelId: string, @Query() query: PageQueryDto) {
    return this.service.listForHotel(hotelId, query);
  }
}
