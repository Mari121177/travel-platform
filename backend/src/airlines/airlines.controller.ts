import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { AirlinesService } from './airlines.service';
import { CreateAirlineDto, UpdateAirlineDto } from './dto/airline.dto';

@ApiTags('Airlines')
@Controller('airlines')
export class AirlinesController {
  constructor(private readonly service: AirlinesService) {}

  @Roles(Role.Admin)
  @Post()
  @ApiOperation({ summary: 'Admin creates an airline profile (FLT-01)' })
  create(@Body() dto: CreateAirlineDto) {
    return this.service.create(dto);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get airline profile and policies (FLT-01)' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles(Role.AirlineModerator)
  @Patch(':id')
  @ApiOperation({ summary: 'Moderator edits own airline: name, code, logo (FLT-01)' })
  update(@Param('id') id: string, @Body() dto: UpdateAirlineDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }
}
