import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import {
  Airport,
  AirportDocument,
} from '../reference-data/schemas/airport.schema';
import { ListAirportsQueryDto } from './dto/list-airports-query.dto';

// GEN-05: fixed page size
const PAGE_SIZE = 10;

// Makes user text safe to use inside a regular expression
const escapeRegex = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// FLT-02: read-only access to the seeded airports (reference-data module).
// There is no create, update or delete here.
@Injectable()
export class AirportsService {
  constructor(
    @InjectModel(Airport.name)
    private readonly airportModel: Model<AirportDocument>,
  ) {}

  async findAll(query: ListAirportsQueryDto) {
    const page = query.page ?? 1;
    const filter: Record<string, unknown> = {};

    if (query.q) {
      const pattern = new RegExp(escapeRegex(query.q), 'i');
      filter.$or = [{ name: pattern }, { iataCode: pattern }];
    }
    if (query.countryCode) {
      filter.countryCode = query.countryCode.toUpperCase();
    }
    if (query.cityId) {
      // city ids in Cities.csv are lower-case, e.g. "new_york"
      filter.cityId = query.cityId.toLowerCase();
    }

    const [data, total] = await Promise.all([
      this.airportModel
        .find(filter, { _id: 0, __v: 0 })
        .sort({ iataCode: 1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean()
        .exec(),
      this.airportModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  }

  // Used by flight search (FLT-02: search accepts only listed airports, and
  // it needs each airport's time zone). Unknown codes are simply missing from
  // the result, so the caller can detect them.
  async getByCodes(codes: string[]) {
    const upper = [...new Set(codes.map((c) => c.toUpperCase()))];
    return this.airportModel
      .find({ iataCode: { $in: upper } }, { _id: 0, __v: 0 })
      .lean()
      .exec();
  }
}