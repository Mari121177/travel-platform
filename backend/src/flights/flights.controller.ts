import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import {
  CancelFlightDto, CreateCabinDto, CreateFlightDto, UpdateCabinDto, UpdateFlightDto,
} from './dto/flight.dto';
import { FlightsService } from './flights.service';

@ApiTags('Flights (airline moderator)')
@Controller('flights')
export class FlightsController {
  constructor(private readonly service: FlightsService) {}

  @Roles(Role.AirlineModerator)
  @Post()
  @ApiOperation({ summary: 'Create a flight for your airline; times are LOCAL to each airport (FLT-03)' })
  create(@Body() dto: CreateFlightDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Roles(Role.AirlineModerator)
  @Patch(':id')
  @ApiOperation({ summary: 'Edit times/airports of your own Scheduled flight (FLT-05)' })
  update(@Param('id') id: string, @Body() dto: UpdateFlightDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }

  @Roles(Role.AirlineModerator)
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel your own Scheduled flight (FLT-06)' })
  cancel(@Param('id') id: string, @Body() dto: CancelFlightDto, @CurrentUser() user: AuthUser) {
    return this.service.cancel(id, dto, user);
  }

  @Roles(Role.AirlineModerator)
  @Post(':id/cabins')
  @ApiOperation({ summary: 'Add a cabin category: seats, price, free baggage (FLT-04)' })
  addCabin(@Param('id') id: string, @Body() dto: CreateCabinDto, @CurrentUser() user: AuthUser) {
    return this.service.addCabin(id, dto, user);
  }

  @Roles(Role.AirlineModerator)
  @Patch(':id/cabins/:cabinId')
  @ApiOperation({ summary: 'Edit cabin price / seat count (FLT-04, FLT-05)' })
  updateCabin(
    @Param('id') id: string,
    @Param('cabinId') cabinId: string,
    @Body() dto: UpdateCabinDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateCabin(id, cabinId, dto, user);
  }
}
