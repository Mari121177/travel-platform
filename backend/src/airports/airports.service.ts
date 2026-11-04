import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Airport, AirportDocument } from './airport.schema';

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class AirportsService {
  constructor(@InjectModel(Airport.name) private model: Model<AirportDocument>) {}

  async findAll(q?: string, countryCode?: string, cityId?: string, page = 1, limit = 10) {
    const filter: Record<string, any> = {};
    if (countryCode) filter.countryCode = countryCode.toUpperCase();
    if (cityId) filter.cityId = cityId.toLowerCase();
    if (q) {
      const r = new RegExp(esc(q), 'i');
      filter.$or = [{ iataCode: r }, { name: r }, { cityId: r }];
    }
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ iataCode: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }

  /** Used by flights and flight search: Map<IATA code, airport> */
  async getByCodes(codes: string[]) {
    const list = await this.model
      .find({ iataCode: { $in: codes.map((c) => c.toUpperCase()) } })
      .lean();
    return new Map(list.map((a) => [a.iataCode, a] as const));
  }
}
