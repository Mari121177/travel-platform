import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { City, CityDocument } from './schemas/city.schema';
import { Country, CountryDocument } from './schemas/country.schema';

@Injectable()
export class ReferenceDataService {
  constructor(
    @InjectModel(Country.name)
    private readonly countryModel: Model<CountryDocument>,
    @InjectModel(City.name)
    private readonly cityModel: Model<CityDocument>,
  ) {}

  // GEN-12: read-only lists for the frontend dropdowns (public).
  async getCountries() {
    const data = await this.countryModel
      .find({}, { _id: 0, __v: 0 })
      .sort({ name: 1 })
      .lean()
      .exec();
    return { data, total: data.length };
  }

  async getCities(countryCode?: string) {
    const filter: Record<string, unknown> = {};
    if (countryCode) {
      filter.countryCode = countryCode.toUpperCase();
    }
    const data = await this.cityModel
      .find(filter, { _id: 0, __v: 0 })
      .sort({ name: 1 })
      .lean()
      .exec();
    return { data, total: data.length };
  }

  // The supported currencies are the currency codes listed in Countries.csv
  async getSupportedCurrencies(): Promise<string[]> {
    const codes = (await this.countryModel.distinct('currency')) as string[];
    return [...codes].sort();
  }

  // Use this to validate preferredCurrency (ACC-09) and budget currencies (ITN-14, ITN-18)
  async isSupportedCurrency(code: string): Promise<boolean> {
    const normalized = code.trim().toUpperCase();
    const found = await this.countryModel.exists({ currency: normalized });
    return found !== null;
  }
}