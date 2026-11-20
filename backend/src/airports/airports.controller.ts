import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { AirportsService } from './airports.service';
import { ListAirportsQueryDto } from './dto/list-airports-query.dto';

// FLT-02: public, read-only. Guests need the airport list to search flights.
@ApiTags('Airports')
@Public()
@Controller('airports')
export class AirportsController {
  constructor(private readonly airportsService: AirportsService) {}

  @Get()
  @ApiOperation({
    summary: 'FLT-02: list the airports (read-only, 10 per page)',
  })
  @ApiOkResponse({
    description:
      'Returns { data, total, page, pageSize, totalPages }. Each airport has iataCode, name, cityId, countryCode and timeZone.',
  })
  @ApiBadRequestResponse({ description: 'Invalid query' })
  findAll(@Query() query: ListAirportsQueryDto) {
    return this.airportsService.findAll(query);
  }
}