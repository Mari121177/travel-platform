import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'HTL-23: rate a Completed reservation (one review per reservation)' })
  create(
    @CurrentUser('id') userId: string,
    @Param('id', ParseObjectIdPipe) bookingId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.service.create(userId, bookingId, dto);
  }

  @Patch('reviews/:id')
  @Roles(Role.User)
  @ApiOperation({ summary: 'HTL-23: edit my review' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.service.update(userId, id, dto);
  }

  @Patch('reviews/:id/reply')
  @Roles(Role.HotelModerator)
  @ApiOperation({ summary: 'HTL-26: hotel moderator replies to a review of their hotel' })
  reply(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.service.reply(id, user, dto);
  }

  @Delete('reviews/:id')
  @Roles(Role.User)
  @ApiOperation({ summary: 'HTL-23: delete my review' })
  remove(@CurrentUser('id') userId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.remove(userId, id);
  }

  @Public()
  @Get('hotels/:id/reviews')
  @ApiOperation({ summary: 'HTL-24: rating summary + reviews (newest first, 10 per page)' })
  list(@Param('id', ParseObjectIdPipe) hotelId: string, @Query() query: PageQueryDto) {
    return this.service.listForHotel(hotelId, query);
  }
}