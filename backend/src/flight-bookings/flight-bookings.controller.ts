import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateFlightBookingDto } from './dto/create-flight-booking.dto';
import { ListFlightBookingsQueryDto } from './dto/list-flight-bookings.dto';
import { ETicketService } from './e-ticket.service';
import { FlightBookingsService } from './flight-bookings.service';

@ApiTags('Flight bookings')
@ApiCookieAuth()
@Roles(Role.User)
@Controller('flight-bookings')
export class FlightBookingsController {
  constructor(
    private readonly service: FlightBookingsService,
    private readonly eTicket: ETicketService,
  ) {}

  @Post('hold')
  @ApiOperation({
    summary:
      'Reserve the seats for 10 minutes and create a PendingPayment booking (FLT-22)',
  })
  hold(@CurrentUser('id') userId: string, @Body() dto: CreateFlightBookingDto) {
    return this.service.hold(userId, dto);
  }

  @Post()
  @ApiOperation({
    summary:
      'Validate passengers and baggage and return the booking summary and total, without reserving seats (FLT-19, FLT-21)',
  })
  summary(@Body() dto: CreateFlightBookingDto) {
    return this.service.summary(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'My flight bookings, grouped as upcoming, past or cancelled (FLT-25)',
  })
  listMine(
    @CurrentUser('id') userId: string,
    @Query() query: ListFlightBookingsQueryDto,
  ) {
    return this.service.listMine(userId, query.group, query.page ?? 1);
  }

  @Get(':id/e-ticket')
  @ApiOperation({
    summary: 'Download my e-ticket as a PDF (Confirmed bookings only) (FLT-23)',
  })
  async eTicketPdf(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    await this.eTicket.stream(userId, id, res);
  }

  @Get(':id/cancel-preview')
  @ApiOperation({
    summary: 'Refund amount if I cancel this booking now (FLT-26, step 1)',
  })
  cancelPreview(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.cancelPreview(userId, id);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary:
      'Cancel my Confirmed booking before departure; seats return, refund is issued (FLT-26, step 2)',
  })
  cancel(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.cancelMine(userId, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Full details of one of my bookings (FLT-25)' })
  getMine(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.getMine(userId, id);
  }
}