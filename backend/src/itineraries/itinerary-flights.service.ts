import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { FlightSearchService } from '../flights/search/flight-search.service';
import type { SearchFlightsQueryDto } from '../flights/search/dto/search-flights-query.dto';
import { Airport } from '../reference-data/schemas/airport.schema';
import { City } from '../reference-data/schemas/city.schema';
import { ItinerariesService } from './itineraries.service';
import { ItineraryFlightsQueryDto } from './dto/itinerary-flights-query.dto';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

@Injectable()
export class ItineraryFlightsService {
  constructor(
    private readonly itineraries: ItinerariesService,
    private readonly flightSearch: FlightSearchService,
    @InjectModel(City.name) private readonly cityModel: Model<City>,
    @InjectModel(Airport.name) private readonly airportModel: Model<Airport>,
  ) {}

  // ITN-26: owner-only. Search flights from a chosen origin airport to the
  // first itinerary city, reusing FLT-11/FLT-12.
  async findForItinerary(
    itineraryId: string,
    user: AuthUser,
    query: ItineraryFlightsQueryDto,
  ) {
    const itinerary = await this.itineraries.getOwnedOrFail(itineraryId, user);
    if (!itinerary.days.length) {
      throw new BadRequestException(
        'Add at least one day with a city before searching flights',
      );
    }

    const cityId = itinerary.days[0].cityId;
    const [city, airports] = await Promise.all([
      this.cityModel.findOne({ cityId }).lean().exec(),
      this.airportModel.find({ cityId }).lean().exec(),
    ]);
    if (!airports.length) {
      throw new NotFoundException(`No airport is configured for ${cityId}`);
    }

    const outboundDate = itinerary.startDate.toISOString().slice(0, 10);
    const lastDayDate = addDays(outboundDate, itinerary.days.length - 1);
    const roundTrip = query.roundTrip || !!query.returnDate;
    const returnDate = roundTrip ? query.returnDate ?? lastDayDate : undefined;

    // The seed has one airport per city. If a city ever gets more, this
    // searches the first one; destination selection can be added then.
    const destination = airports[0].iataCode;
    const search = {
      origin: query.origin,
      destination,
      departureDate: outboundDate,
      returnDate,
      adults: query.adults,
      children: query.children,
      infants: query.infants,
      cabin: query.cabin,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      sortBy: query.sortBy,
      order: query.order,
      page: query.page,
    } as SearchFlightsQueryDto;

    const result = await this.flightSearch.search(search);
    return {
      itineraryId,
      cityId,
      cityName: city?.name ?? null,
      destinationAirports: airports.map((a) => ({
        iataCode: a.iataCode,
        name: a.name,
        timeZone: a.timeZone,
      })),
      outboundDate,
      returnDate: returnDate ?? null,
      ...result,
    };
  }
}
