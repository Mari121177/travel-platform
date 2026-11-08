import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PageQueryDto } from './dto/queries.dto';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { ParseObjectIdPipe } from './parse-object-id.pipe';
import { ReviewsService } from './reviews.service';
import { TempUserId } from './temp-user.decorator';

@ApiTags('Hotel Reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  // TODO(auth): @UseGuards(JwtAuthGuard, RolesGuard) @Roles('user')
  @Post('hotel-bookings/:id/review')
  @ApiHeader({ name: 'x-user-id', required: true, description: 'TEMPORARY until auth is merged' })
  @ApiOperation({ summary: 'HTL-23: rate a Completed reservation (one review per reservation)' })
  create(
    @TempUserId() userId: string,
    @Param('id', ParseObjectIdPipe) bookingId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.service.create(userId, bookingId, dto);
  }

  // TODO(auth): @UseGuards(JwtAuthGuard, RolesGuard) @Roles('user')
  @Patch('reviews/:id')
  @ApiHeader({ name: 'x-user-id', required: true, description: 'TEMPORARY until auth is merged' })
  @ApiOperation({ summary: 'HTL-23: edit my review' })
  update(
    @TempUserId() userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.service.update(userId, id, dto);
  }

  // TODO(auth): @UseGuards(JwtAuthGuard, RolesGuard) @Roles('user')
  @Delete('reviews/:id')
  @ApiHeader({ name: 'x-user-id', required: true, description: 'TEMPORARY until auth is merged' })
  @ApiOperation({ summary: 'HTL-23: delete my review' })
  remove(@TempUserId() userId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.remove(userId, id);
  }

  // public
  @Get('hotels/:id/reviews')
  @ApiOperation({ summary: 'HTL-24: rating summary + reviews (newest first, 10 per page)' })
  list(@Param('id', ParseObjectIdPipe) hotelId: string, @Query() query: PageQueryDto) {
    return this.service.listForHotel(hotelId, query);
  }
}
