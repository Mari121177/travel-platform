import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { FlightPassengersService } from './flight-passengers.service';

@ApiTags('Flight bookings (airline moderator)')
@ApiCookieAuth()
@Roles(Role.AirlineModerator)
@Controller('flights')
export class FlightPassengersController {
  constructor(private readonly service: FlightPassengersService) {}

  @Get(':id/bookings')
  @ApiOperation({
    summary:
      'Bookings of one of my airline flights and seats remaining per cabin (FLT-29)',
  })
  bookings(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('page') page?: string,
  ) {
    const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
    return this.service.listBookings(user, id, p);
  }

  @Get(':id/passengers/export')
  @ApiOperation({ summary: 'Passenger list of a flight as CSV (FLT-29)' })
  async export(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const csv = await this.service.exportCsv(user, id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="passengers-${id}.csv"`,
    );
    res.send(csv);
  }
}