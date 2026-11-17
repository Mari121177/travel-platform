import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Airline, AirlineDocument } from '../../airlines/airline.schema';
import {
  Airport,
  AirportDocument,
} from '../../reference-data/schemas/airport.schema';
import { Cabin, CabinDocument } from '../cabin.schema';
import { FlightStatus } from '../enums/flight.enums';
import { Flight, FlightDocument } from '../flight.schema';
import type {
  FlightSearchPageDto,
  SearchFlightsResponseDto,
} from './dto/flight-search-response.dto';
import type { SearchFlightsQueryDto } from './dto/search-flights-query.dto';
import { buildLegPage } from './search.core';
import type { AirportInfo, SearchableFlight } from './search.types';
import { isPastLocalDate, validateSearchCriteria } from './search.utils';

// FLT-11, FLT-12, FLT-15: public flight search (one-way and round trip)
@Injectable()
export class FlightSearchService {
  constructor(
    @InjectModel(Flight.name)
    private readonly flightModel: Model<FlightDocument>,
    @InjectModel(Cabin.name) private readonly cabinModel: Model<CabinDocument>,
    @InjectModel(Airline.name)
    private readonly airlineModel: Model<AirlineDocument>,
    @InjectModel(Airport.name)
    private readonly airportModel: Model<AirportDocument>,
  ) {}

  async search(
    query: SearchFlightsQueryDto,
  ): Promise<SearchFlightsResponseDto> {
    // Rules that compare several fields (infants vs adults, min vs max price...)
    const problems = validateSearchCriteria(query);
    if (problems.length > 0) throw new BadRequestException(problems);

    // FLT-02: only airports from the predefined list are accepted
    const airports = await this.loadAirports([query.origin, query.destination]);
    const unknown = [query.origin, query.destination].filter(
      (code) => !airports.has(code),
    );
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Unknown airport: ${unknown.join(', ')}. Only airports from the predefined list are allowed`,
      );
    }

    // FLT-11: the departure date is a local date at the departure airport
    if (
      isPastLocalDate(query.departureDate, airports.get(query.origin)!.timeZone)
    ) {
      throw new BadRequestException('departureDate cannot be in the past');
    }

    const outbound = await this.searchLeg(
      query.origin,
      query.destination,
      query.departureDate,
      query,
      airports,
    );

    // FLT-12: a return date makes it a round trip; the return leg flies the
    // other way, on a local date at the original destination
    if (!query.returnDate) {
      return { tripType: 'one-way', outbound };
    }
    const returnLeg = await this.searchLeg(
      query.destination,
      query.origin,
      query.returnDate,
      query,
      airports,
    );
    return { tripType: 'round-trip', outbound, return: returnLeg };
  }

  private async searchLeg(
    from: string,
    to: string,
    localDate: string,
    query: SearchFlightsQueryDto,
    airports: Map<string, AirportInfo>,
  ): Promise<FlightSearchPageDto> {
    // FLT-30: only Scheduled flights. departureLocalDate is stored by the flight
    // module (local date at the departure airport), so no time zone maths here.
    const flights = await this.flightModel
      .find({
        departureAirport: from,
        arrivalAirport: to,
        departureLocalDate: localDate,
        status: FlightStatus.SCHEDULED,
        departureTime: { $gt: new Date() }, // do not show flights that already left
      })
      .lean()
      .exec();

    const flightIds = flights.map((f) => f._id);
    const airlineIds = [...new Set(flights.map((f) => String(f.airline)))];
    const [cabins, airlines] = await Promise.all([
      this.cabinModel
        .find({ flight: { $in: flightIds } })
        .lean()
        .exec(),
      this.airlineModel
        .find({ _id: { $in: airlineIds } }, { name: 1, isActive: 1 })
        .lean()
        .exec(),
    ]);

    const airlineById = new Map(airlines.map((a) => [String(a._id), a]));
    const searchable: SearchableFlight[] = [];
    for (const f of flights) {
      const airline = airlineById.get(String(f.airline));
      if (!airline) continue;
      searchable.push({
        id: String(f._id),
        flightNumber: f.flightNumber,
        airline: {
          id: String(airline._id),
          name: airline.name,
          isActive: airline.isActive,
        },
        originCode: f.departureAirport,
        destinationCode: f.arrivalAirport,
        departureTime: f.departureTime,
        arrivalTime: f.arrivalTime,
        cabins: cabins
          .filter((c) => String(c.flight) === String(f._id))
          .map((c) => ({
            cabin: c.cabinClass,
            fare: c.price,
            totalSeats: c.totalSeats,
            bookedSeats: c.bookedSeats,
            heldSeats: c.heldSeats,
          })),
      });
    }

    return buildLegPage(searchable, airports, query);
  }

  private async loadAirports(codes: string[]) {
    const list = await this.airportModel
      .find({ iataCode: { $in: [...new Set(codes)] } })
      .lean()
      .exec();
    return new Map<string, AirportInfo>(
      list.map((a) => [
        a.iataCode,
        { iataCode: a.iataCode, name: a.name, timeZone: a.timeZone },
      ]),
    );
  }
}