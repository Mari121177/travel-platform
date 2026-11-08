import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { existsSync, readFileSync } from 'fs';
import { Model } from 'mongoose';
import { join } from 'path';
import { parseCsvObjects } from '../common/csv/parse-csv';
import { Airport, AirportDocument } from './schemas/airport.schema';
import { Attraction, AttractionDocument } from './schemas/attraction.schema';
import { City, CityDocument } from './schemas/city.schema';
import { Country, CountryDocument } from './schemas/country.schema';

type CsvRow = Record<string, string>;

const field = (row: CsvRow, key: string) => (row[key] ?? '').trim();

// GEN-12: seeds countries, cities, airports and attractions from the official
// CSV files at startup. Safe to run on every start: records are upserted by
// their key, so nothing is duplicated.
@Injectable()
export class ReferenceDataSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(ReferenceDataSeeder.name);

  constructor(
    @InjectModel(Country.name)
    private readonly countryModel: Model<CountryDocument>,
    @InjectModel(City.name) private readonly cityModel: Model<CityDocument>,
    @InjectModel(Airport.name)
    private readonly airportModel: Model<AirportDocument>,
    @InjectModel(Attraction.name)
    private readonly attractionModel: Model<AttractionDocument>,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.seedCountries();
      await this.seedCities();
      await this.seedAirports();
      await this.seedAttractions();
      await this.checkReferences();
    } catch (err) {
      // Do not stop the whole backend, but make the problem impossible to miss
      this.logger.error(
        `Reference data seeding failed: ${(err as Error).message}`,
      );
    }
  }

  private async seedCountries() {
    const rows = this.readCsv('Countries.csv', ['code', 'name', 'currency']);
    const skipped: number[] = [];

    const ops = rows.flatMap((row, index) => {
      const code = field(row, 'code').toUpperCase();
      const name = field(row, 'name');
      const currency = field(row, 'currency').toUpperCase();
      if (!/^[A-Z]{2,3}$/.test(code) || !name || !/^[A-Z]{3}$/.test(currency)) {
        skipped.push(index + 2);
        return [];
      }
      return [
        {
          updateOne: {
            filter: { code },
            update: { $set: { code, name, currency } },
            upsert: true,
          },
        },
      ];
    });

    if (ops.length > 0) {
      await this.ignoreDuplicates(
        this.countryModel.bulkWrite(ops, { ordered: false }),
      );
    }
    this.report('Countries.csv', ops.length, skipped);
  }

  private async seedCities() {
    const rows = this.readCsv('Cities.csv', ['city_id', 'name', 'country_code']);
    const skipped: number[] = [];

    const ops = rows.flatMap((row, index) => {
      const cityId = field(row, 'city_id');
      const name = field(row, 'name');
      const countryCode = field(row, 'country_code').toUpperCase();
      if (!cityId || !name || !/^[A-Z]{2,3}$/.test(countryCode)) {
        skipped.push(index + 2);
        return [];
      }
      return [
        {
          updateOne: {
            filter: { cityId },
            update: { $set: { cityId, name, countryCode } },
            upsert: true,
          },
        },
      ];
    });

    if (ops.length > 0) {
      await this.ignoreDuplicates(
        this.cityModel.bulkWrite(ops, { ordered: false }),
      );
    }
    this.report('Cities.csv', ops.length, skipped);
  }

  private async seedAirports() {
    const rows = this.readCsv('Airports.csv', [
      'iata_code',
      'name',
      'city_id',
      'country_code',
      'time_zone',
    ]);
    const skipped: number[] = [];

    const ops = rows.flatMap((row, index) => {
      const iataCode = field(row, 'iata_code').toUpperCase();
      const name = field(row, 'name');
      const cityId = field(row, 'city_id');
      const countryCode = field(row, 'country_code').toUpperCase();
      const timeZone = field(row, 'time_zone');
      if (
        !/^[A-Z]{3}$/.test(iataCode) ||
        !name ||
        !cityId ||
        !/^[A-Z]{2,3}$/.test(countryCode) ||
        !this.isValidTimeZone(timeZone)
      ) {
        skipped.push(index + 2);
        return [];
      }
      return [
        {
          updateOne: {
            filter: { iataCode },
            update: {
              $set: { iataCode, name, cityId, countryCode, timeZone },
            },
            upsert: true,
          },
        },
      ];
    });

    if (ops.length > 0) {
      await this.ignoreDuplicates(
        this.airportModel.bulkWrite(ops, { ordered: false }),
      );
    }
    this.report('Airports.csv', ops.length, skipped);
  }

  private async seedAttractions() {
    const rows = this.readCsv('Attractions.csv', [
      'attraction_id',
      'name',
      'city_id',
    ]);
    const skipped: number[] = [];

    const ops = rows.flatMap((row, index) => {
      const attractionId = field(row, 'attraction_id');
      const name = field(row, 'name');
      const cityId = field(row, 'city_id');
      if (!attractionId || !name || !cityId) {
        skipped.push(index + 2);
        return [];
      }
      return [
        {
          updateOne: {
            filter: { attractionId },
            update: { $set: { attractionId, name, cityId } },
            upsert: true,
          },
        },
      ];
    });

    if (ops.length > 0) {
      await this.ignoreDuplicates(
        this.attractionModel.bulkWrite(ops, { ordered: false }),
      );
    }
    this.report('Attractions.csv', ops.length, skipped);
  }

  // Warns when a record points to a city or country that does not exist
  private async checkReferences() {
    const countries = new Set<string>(
      (await this.countryModel.distinct('code')) as string[],
    );
    const cities = new Set<string>(
      (await this.cityModel.distinct('cityId')) as string[],
    );
    this.warnMissing(
      'Cities -> countries',
      (await this.cityModel.distinct('countryCode')) as string[],
      countries,
    );
    this.warnMissing(
      'Airports -> cities',
      (await this.airportModel.distinct('cityId')) as string[],
      cities,
    );
    this.warnMissing(
      'Attractions -> cities',
      (await this.attractionModel.distinct('cityId')) as string[],
      cities,
    );
  }

  private warnMissing(label: string, values: string[], known: Set<string>) {
    const missing = values.filter((value) => !known.has(value));
    if (missing.length > 0) {
      this.logger.warn(`${label}: unknown reference(s): ${missing.join(', ')}`);
    }
  }

  private readCsv(fileName: string, requiredColumns: string[]): CsvRow[] {
    // docs/reference-data at the repository root. REFERENCE_DATA_DIR overrides it.
    const dir =
      process.env.REFERENCE_DATA_DIR ??
      join(process.cwd(), '..', 'docs', 'reference-data');
    const path = join(dir, fileName);
    if (!existsSync(path)) {
      throw new Error(`${fileName} not found in ${dir}`);
    }

    const { header, rows } = parseCsvObjects(readFileSync(path, 'utf8'));
    const missing = requiredColumns.filter((column) => !header.includes(column));
    if (missing.length > 0) {
      throw new Error(`${fileName} is missing column(s): ${missing.join(', ')}`);
    }
    return rows;
  }

  private isValidTimeZone(timeZone: string) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone });
      return true;
    } catch {
      return false;
    }
  }

  private report(file: string, processed: number, skipped: number[]) {
    this.logger.log(`${file}: ${processed} record(s) seeded`);
    if (skipped.length > 0) {
      this.logger.warn(
        `${file}: skipped invalid row(s) at line(s) ${skipped.join(', ')}`,
      );
    }
  }

  // Several developers can start the app at the same moment. If another process
  // inserted the same record first, the duplicate key error is harmless.
  private async ignoreDuplicates(write: Promise<unknown>) {
    try {
      await write;
    } catch (err) {
      if (!this.onlyDuplicateKeyErrors(err)) {
        throw err;
      }
    }
  }

  private onlyDuplicateKeyErrors(err: unknown) {
    const e = err as { code?: number; writeErrors?: { code?: number }[] };
    if (Array.isArray(e.writeErrors) && e.writeErrors.length > 0) {
      return e.writeErrors.every((w) => w.code === 11000);
    }
    return e.code === 11000;
  }
}