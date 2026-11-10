import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { PageQueryDto } from './dto/queries.dto';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
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