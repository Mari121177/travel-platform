import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Country, CountryDocument } from './schemas/country.schema';

@Injectable()
export class ReferenceDataService {
  constructor(
    @InjectModel(Country.name)
    private readonly countryModel: Model<CountryDocument>,
  ) {}

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