import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import type { CostItem } from './budget-summary';
import {
  ExchangeRate,
  ExchangeRateDocument,
} from './schemas/exchange-rate.schema';

const FX_URL = 'https://api.fxratesapi.com/latest';
const FX_TIMEOUT_MS = 8000;

export interface RatesSnapshot {
  base: string;
  rates: Record<string, number>;
  // The date reported by the API (ITN-18: "show the rate date")
  rateDate: string;
  // true when today's fetch failed and the last cached rates are used
  stale: boolean;
}

export interface ConvertedItems {
  items: CostItem[];
  currency: string;
  // null only when nothing needed converting and no rates could be loaded
  rateDate: string | null;
  stale: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);
  // Requests that arrive together share one API call
  private inflight: Promise<RatesSnapshot> | null = null;

  constructor(
    @InjectModel(ExchangeRate.name)
    private readonly rateModel: Model<ExchangeRateDocument>,
    private readonly config: ConfigService,
    private readonly referenceData: ReferenceDataService,
  ) {}

  /**
   * ITN-18: today's rates. Fetched once per day and cached in the database.
   * If the API fails, the last cached rates are used. With no cache at all the
   * answer is 503.
   */
  async getRates(): Promise<RatesSnapshot> {
    const today = new Date().toISOString().slice(0, 10);
    const cached = await this.rateModel.findOne({ day: today }).lean().exec();
    if (cached) return this.toSnapshot(cached, false);

    if (!this.inflight) {
      this.inflight = this.refresh(today).finally(() => {
        this.inflight = null;
      });
    }
    return this.inflight;
  }

  /** Converts one amount. Amounts already in the target currency stay as is. */
  convert(
    amount: number,
    from: string,
    to: string,
    snapshot: RatesSnapshot,
  ): number {
    if (from === to) return amount;
    const fromRate = snapshot.rates[from];
    const toRate = snapshot.rates[to];
    if (!fromRate || !toRate) {
      const missing = !fromRate ? from : to;
      throw new BadRequestException(
        `No exchange rate is available for "${missing}"`,
      );
    }
    // Rates are relative to the base: amount / fromRate is the base amount
    return (amount / fromRate) * toRate;
  }

  /**
   * ITN-18: every item converted into the target currency (rounded to cents),
   * with the rate date. The target must be a supported currency.
   */
  async convertItems(
    items: CostItem[],
    targetCurrency: string,
  ): Promise<ConvertedItems> {
    const target = targetCurrency.trim().toUpperCase();
    if (!(await this.referenceData.isSupportedCurrency(target))) {
      throw new BadRequestException(`Currency "${target}" is not supported`);
    }

    const needsRates = items.some((item) => item.currency !== target);
    let snapshot: RatesSnapshot | null = null;
    try {
      snapshot = await this.getRates();
    } catch (error) {
      // Nothing to convert: the budget can still be shown without rates
      if (needsRates) throw error;
    }

    const converted = items.map((item) => {
      if (item.currency === target) return { ...item };
      if (!snapshot) {
        throw new ServiceUnavailableException(
          'Exchange rates are currently unavailable',
        );
      }
      return {
        ...item,
        currency: target,
        amount: round2(
          this.convert(item.amount, item.currency, target, snapshot),
        ),
      };
    });

    return {
      items: converted,
      currency: target,
      rateDate: snapshot?.rateDate ?? null,
      stale: snapshot?.stale ?? false,
    };
  }

  // ---- helpers ----

  private async refresh(today: string): Promise<RatesSnapshot> {
    try {
      const fetched = await this.fetchLatest();
      const saved = await this.rateModel
        .findOneAndUpdate(
          { day: today },
          {
            day: today,
            base: fetched.base,
            rateDate: new Date(fetched.date),
            rates: fetched.rates,
          },
          { upsert: true, new: true },
        )
        .lean()
        .exec();
      if (!saved) throw new Error('Could not save the rates');
      return this.toSnapshot(saved, false);
    } catch (error) {
      this.logger.warn(
        `Exchange-rate fetch failed, using the last cached rates: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      const last = await this.rateModel
        .findOne()
        .sort({ day: -1 })
        .lean()
        .exec();
      if (!last) {
        throw new ServiceUnavailableException(
          'Exchange rates are currently unavailable',
        );
      }
      return this.toSnapshot(last, true);
    }
  }

  private async fetchLatest(): Promise<{
    base: string;
    date: string;
    rates: Record<string, number>;
  }> {
    // The key stays in the backend .env and is never sent to the client
    const apiKey = this.config.get<string>('FXRATES_API_KEY');
    if (!apiKey) throw new Error('FXRATES_API_KEY is not set');

    const response = await fetch(FX_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(FX_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`API answered ${response.status}`);

    const body = (await response.json()) as {
      success?: boolean;
      base?: string;
      date?: string;
      rates?: Record<string, number>;
    };
    if (!body.success || !body.base || !body.date || !body.rates) {
      throw new Error('Unexpected API response');
    }
    return { base: body.base, date: body.date, rates: body.rates };
  }

  private toSnapshot(
    doc: { base: string; rateDate: Date; rates: Record<string, number> },
    stale: boolean,
  ): RatesSnapshot {
    return {
      base: doc.base,
      rates: doc.rates,
      rateDate: doc.rateDate.toISOString().slice(0, 10),
      stale,
    };
  }
}
