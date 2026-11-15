import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { City, CityDocument } from '../reference-data/schemas/city.schema';
import {
  Country,
  CountryDocument,
} from '../reference-data/schemas/country.schema';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { toCostItems } from './budget-summary';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { ListItinerariesQueryDto } from './dto/list-itineraries-query.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';
import { ExchangeRatesService } from './exchange-rates.service';
import { ITINERARIES_PAGE_SIZE } from './itinerary.constants';
import { buildDayViews, groupDaysByCity } from './itinerary-view';
import type {
  ActivityItem,
  BudgetItem,
  PlanItems,
  TransportItem,
} from './plan-items';
import { Activity, ActivityDocument } from './schemas/activity.schema';
import {
  BudgetEntry,
  BudgetEntryDocument,
} from './schemas/budget-entry.schema';
import {
  Itinerary,
  ItineraryDocument,
  ItineraryVisibility,
} from './schemas/itinerary.schema';
import {
  TransportCost,
  TransportCostDocument,
} from './schemas/transport-cost.schema';

@Injectable()
export class ItinerariesService {
  constructor(
    @InjectModel(Itinerary.name)
    private readonly itineraryModel: Model<ItineraryDocument>,
    @InjectModel(Country.name)
    private readonly countryModel: Model<CountryDocument>,
    @InjectModel(City.name)
    private readonly cityModel: Model<CityDocument>,
    @InjectModel(Activity.name)
    private readonly activityModel: Model<ActivityDocument>,
    @InjectModel(BudgetEntry.name)
    private readonly budgetModel: Model<BudgetEntryDocument>,
    @InjectModel(TransportCost.name)
    private readonly transportModel: Model<TransportCostDocument>,
    private readonly exchangeRates: ExchangeRatesService,
  ) {}

  // ITN-01
  async create(userId: string, dto: CreateItineraryDto) {
    await this.assertCountriesExist(dto.countries);
    return this.itineraryModel.create({
      ownerId: userId,
      title: dto.title,
      countries: dto.countries,
      startDate: new Date(dto.startDate),
      visibility: dto.visibility ?? ItineraryVisibility.Private,
    });
  }

  // ITN-03: the logged-in user's own itineraries, most recently updated first
  async findMine(userId: string, query: ListItinerariesQueryDto) {
    const page = query.page ?? 1;
    const limit = ITINERARIES_PAGE_SIZE;
    const filter = { ownerId: userId };

    const [docs, total] = await Promise.all([
      this.itineraryModel
        .find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.itineraryModel.countDocuments(filter),
    ]);

    // The list shows how many days each itinerary has, not the days themselves
    const items = docs.map(({ days, ...itinerary }) => ({
      ...itinerary,
      dayCount: days.length,
    }));

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ITN-03: one itinerary. Private ones are owner-only.
  async findOne(id: string, user: AuthUser) {
    const itinerary = await this.getReadableOrFail(id, user);
    return this.buildView(itinerary, user);
  }

  // ITN-01 edit, ITN-20 visibility
  async update(id: string, user: AuthUser, dto: UpdateItineraryDto) {
    if (Object.values(dto).some((value) => value === null)) {
      throw new BadRequestException('Itinerary fields must not be null');
    }
    const itinerary = await this.getOwnedOrFail(id, user);

    if (dto.countries) {
      await this.assertCountriesExist(dto.countries);
      itinerary.countries = dto.countries;
    }
    if (dto.title !== undefined) itinerary.title = dto.title;
    if (dto.startDate !== undefined)
      itinerary.startDate = new Date(dto.startDate);
    if (dto.visibility !== undefined) itinerary.visibility = dto.visibility;

    return this.buildView(await itinerary.save(), user);
  }

  // ITN-01 delete
  async remove(id: string, user: AuthUser) {
    const itinerary = await this.getOwnedOrFail(id, user);
    await itinerary.deleteOne();
    await this.deleteAllPlanItems(itinerary._id);
    return { message: 'Itinerary deleted' };
  }

  // ---- helpers ----

  private async getOrFail(id: string): Promise<ItineraryDocument> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid itinerary id');
    }
    const itinerary = await this.itineraryModel.findById(id);
    if (!itinerary) throw new NotFoundException('Itinerary not found');
    return itinerary;
  }

  /**
   * The itinerary with its days numbered and dated, what is planned on each
   * day, and the days grouped by city (ITN-05, ITN-09, ITN-10, ITN-14, ITN-16).
   * Use this whenever an itinerary is sent to the client. When a viewer is
   * given, the group subtotals are also converted into their preferred
   * currency (ITN-18).
   */
  async buildView(itinerary: ItineraryDocument, viewer?: AuthUser) {
    const plain = itinerary.toObject();
    const cityIds = [...new Set(plain.days.map((day) => day.cityId))];
    const cities = cityIds.length
      ? await this.cityModel
          .find({ cityId: { $in: cityIds } })
          .lean()
          .exec()
      : [];
    const cityNames = new Map(cities.map((city) => [city.cityId, city.name]));

    const plan = await this.loadPlanItems(itinerary._id);
    const days = buildDayViews(plain.startDate, plain.days, cityNames, plan);
    const costItems = toCostItems(plan);
    const cityGroups = groupDaysByCity(days, costItems);
    const view = { ...plain, days, cityGroups };
    if (!viewer) return view;

    // ITN-18: best effort. If rates are unavailable the itinerary still opens,
    // and the budget summary endpoint reports the exact error.
    try {
      const display = await this.exchangeRates.convertItems(
        costItems,
        viewer.preferredCurrency,
      );
      const converted = groupDaysByCity(days, display.items);
      cityGroups.forEach((group, index) => {
        group.convertedSubtotal =
          converted[index].budgetSubtotals[display.currency] ?? 0;
      });
      return {
        ...view,
        budgetCurrency: display.currency,
        rateDate: display.rateDate,
        ratesStale: display.stale,
      };
    } catch {
      return view;
    }
  }

  // Only the owner may change or delete (GEN-13). Someone else gets 404 for a
  // private or hidden itinerary and 403 for a visible public one.
  async getOwnedOrFail(id: string, user: AuthUser): Promise<ItineraryDocument> {
    const itinerary = await this.getOrFail(id);
    if (itinerary.ownerId.toString() !== user.id) {
      if (
        itinerary.visibility === ItineraryVisibility.Private ||
        itinerary.isHidden
      ) {
        throw new NotFoundException('Itinerary not found');
      }
      throw new ForbiddenException('You do not own this itinerary');
    }
    return itinerary;
  }

  // Reading: private itineraries are owner-only (ITN-20), hidden ones are
  // visible only to their author and admins (GEN-10). 404 for everyone else.
  async getReadableOrFail(
    id: string,
    user: AuthUser,
  ): Promise<ItineraryDocument> {
    const itinerary = await this.getOrFail(id);
    if (itinerary.ownerId.toString() !== user.id) {
      const hiddenFromViewer = itinerary.isHidden && user.role !== Role.Admin;
      if (
        itinerary.visibility === ItineraryVisibility.Private ||
        hiddenFromViewer
      ) {
        throw new NotFoundException('Itinerary not found');
      }
    }
    return itinerary;
  }

  /** ITN-10, ITN-14, ITN-16: the day must belong to the itinerary. */
  assertDayExists(itinerary: ItineraryDocument, dayId: string) {
    if (!itinerary.days.some((day) => day._id.toString() === dayId)) {
      throw new NotFoundException('Day not found');
    }
  }

  /** ITN-14, ITN-16: money must be in a currency from the seeded countries. */
  async assertCurrencySupported(currency: string) {
    const found = await this.countryModel.exists({ currency });
    if (!found) {
      throw new BadRequestException(`Currency "${currency}" is not supported`);
    }
  }

  /** ITN-16: cities must come from the seeded city list. */
  async assertCityExists(cityId: string) {
    const found = await this.cityModel.exists({ cityId });
    if (!found) {
      throw new BadRequestException(`City "${cityId}" is not supported`);
    }
  }

  /** Everything planned in one itinerary (activities, budget, transport). */
  async loadPlanItems(
    itineraryId: Types.ObjectId | string,
  ): Promise<PlanItems> {
    const filter = { itineraryId };
    const [activities, budgetEntries, transportCosts] = await Promise.all([
      this.activityModel.find(filter).lean<ActivityItem[]>().exec(),
      this.budgetModel.find(filter).lean<BudgetItem[]>().exec(),
      this.transportModel.find(filter).lean<TransportItem[]>().exec(),
    ]);
    return { activities, budgetEntries, transportCosts };
  }

  /** ITN-07: when a day is deleted, what was planned on it goes too. */
  async deleteDayPlanItems(itineraryId: string, dayId: string) {
    const filter = { itineraryId, dayId };
    await Promise.all([
      this.activityModel.deleteMany(filter),
      this.budgetModel.deleteMany(filter),
      this.transportModel.deleteMany(filter),
    ]);
  }

  /** ITN-01: when an itinerary is deleted, everything planned in it goes too. */
  private async deleteAllPlanItems(itineraryId: Types.ObjectId) {
    const filter = { itineraryId };
    await Promise.all([
      this.activityModel.deleteMany(filter),
      this.budgetModel.deleteMany(filter),
      this.transportModel.deleteMany(filter),
    ]);
  }

  private async assertCountriesExist(codes: string[]) {
    const found = await this.countryModel.countDocuments({
      code: { $in: codes },
    });
    if (found !== codes.length) {
      throw new BadRequestException(
        'One or more country codes are not supported',
      );
    }
  }
}
