import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ListCitiesQueryDto } from './dto/list-cities-query.dto';
import { ReferenceDataService } from './reference-data.service';

@ApiTags('Reference data')
@Public()
@Controller('reference')
export class ReferenceDataController {
  constructor(private readonly referenceDataService: ReferenceDataService) {}

  @Get('countries')
  @ApiOperation({
    summary: 'GEN-12: read-only list of the seeded countries',
  })
  @ApiOkResponse({
    description: 'Returns { data, total }. Each country has code, name and currency.',
  })
  getCountries() {
    return this.referenceDataService.getCountries();
  }

  @Get('cities')
  @ApiOperation({
    summary: 'GEN-12: read-only list of the seeded cities, optionally by country',
  })
  @ApiOkResponse({
    description: 'Returns { data, total }. Each city has cityId, name and countryCode.',
  })
  @ApiBadRequestResponse({ description: 'countryCode is not 2 letters' })
  getCities(@Query() query: ListCitiesQueryDto) {
    return this.referenceDataService.getCities(query.countryCode);
  }
}
