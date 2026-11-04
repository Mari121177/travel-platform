import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AirportsService } from './airports.service';

@ApiTags('Airports')
@Controller('airports')
export class AirportsController {
  constructor(private service: AirportsService) {}

  @Get()
  @ApiOperation({ summary: 'List/search the predefined airports (FLT-02)' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'countryCode', required: false })
  @ApiQuery({ name: 'cityId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false, description: 'default 10, max 100' })
  findAll(
    @Query('q') q?: string,
    @Query('countryCode') countryCode?: string,
    @Query('cityId') cityId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(
      q, countryCode, cityId,
      Math.max(Number(page) || 1, 1),
      Math.min(Number(limit) || 10, 100),
    );
  }

  @Get(':iataCode')
  @ApiOperation({ summary: 'Get one airport by IATA code (FLT-02)' })
  async findOne(@Param('iataCode') code: string) {
    const airport = (await this.service.getByCodes([code])).get(code.toUpperCase());
    if (!airport) throw new NotFoundException('Airport not found');
    return airport;
  }
}
