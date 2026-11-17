import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SearchFlightsResponseDto } from './dto/flight-search-response.dto';
import { SearchFlightsQueryDto } from './dto/search-flights-query.dto';
import { FlightSearchService } from './flight-search.service';

// Guests can search flights, so no login is needed (see the Guest role)
@ApiTags('Flights (search)')
@Public()
@Controller('flights')
export class FlightSearchController {
  constructor(private readonly service: FlightSearchService) {}

  @Get('search')
  @ApiOperation({
    summary:
      'FLT-11, FLT-12, FLT-15: search one-way or round-trip flights (10 per page)',
    description:
      'Departure and return dates are local dates at the departure airport of each leg. Send returnDate for a round trip. The price filter and sort use the per-person fare of the chosen cabin, or of the cheapest cabin with enough seats for the party.',
  })
  @ApiOkResponse({ type: SearchFlightsResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid search criteria' })
  search(@Query() query: SearchFlightsQueryDto) {
    return this.service.search(query);
  }
}