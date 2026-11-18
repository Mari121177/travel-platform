import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, PipelineStage } from 'mongoose';
import { AccountStatus } from '../common/enums/account-status.enum';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { City, CityDocument } from '../reference-data/schemas/city.schema';
import {
  Country,
  CountryDocument,
} from '../reference-data/schemas/country.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { sumByCurrency, toCostItems } from './budget-summary';
import { PublicSearchQueryDto } from './dto/public-search-query.dto';
import { ItinerariesService } from './itineraries.service';
import { ITINERARIES_PAGE_SIZE } from './itinerary.constants';
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

const escapeRegex = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class PublicItinerariesService {
  constructor(
    @InjectModel(Itinerary.name)
    private readonly itineraryModel: Model<ItineraryDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
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
    private readonly itineraries: ItinerariesService,
  ) {}

  // ITN-21: search public itineraries (guests allowed)
  async search(query: PublicSearchQueryDto) {
    const page = query.page ?? 1;
    const limit = ITINERARIES_PAGE_SIZE;

    if (
      query.minDays !== undefined &&
      query.maxDays !== undefined &&
      query.minDays > query.maxDays
    ) {
      throw new BadRequestException('minDays must not be greater than maxDays');
    }

    // Only public, not hidden (GEN-10). Setting private or deleting removes
    // an itinerary from here immediately (ITN-01, ITN-20).
    const conditions: Record<string, unknown>[] = [
      { visibility: ItineraryVisibility.Public },
      { isHidden: { $ne: true } },
    ];

    const keyword = query.q?.trim();
    if (keyword) {
      const regex = new RegExp(escapeRegex(keyword), 'i');
      const [countries, cities] = await Promise.all([
        this.countryModel
          .find({ $or: [{ name: regex }, { code: keyword.toUpperCase() }] })
          .lean()
          .exec(),
        this.cityModel.find({ name: regex }).lean().exec(),
      ]);
      conditions.push({
        $or: [
          { title: regex },
          { countries: { $in: countries.map((c) => c.code) } },
          { 'days.cityId': { $in: cities.map((c) => c.cityId) } },
        ],
      });
    }
    if (query.country) {
      conditions.push({ countries: query.country.trim().toUpperCase() });
    }
    if (query.city) {
      conditions.push({ 'days.cityId': query.city.trim() });
    }

    // ACC-12: a deactivated user's public itineraries are hidden.
    const deactivated = await this.userModel
      .find({ status: AccountStatus.Deactivated })
      .select('_id')
      .lean()
      .exec();
    if (deactivated.length > 0) {
      conditions.push({ ownerId: { $nin: deactivated.map((u) => u._id) } });
    }

    const pipeline: PipelineStage[] = [
      { $match: { $and: conditions } },
      { $addFields: { dayCount: { $size: { $ifNull: ['$days', []] } } } },
    ];
    if (query.minDays !== undefined || query.maxDays !== undefined) {
      const range: Record<string, number> = {};
      if (query.minDays !== undefined) range.$gte = query.minDays;
      if (query.maxDays !== undefined) range.$lte = query.maxDays;
      pipeline.push({ $match: { dayCount: range } });
    }
    pipeline.push(
      { $sort: { updatedAt: -1, _id: -1 } },
      {
        $facet: {
          items: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $project: {
                title: 1,
                countries: 1,
                startDate: 1,
                ownerId: 1,
                updatedAt: 1,
                dayCount: 1,
                cityIds: { $ifNull: ['$days.cityId', []] },
              },
            },
          ],
          total: [{ $count: 'n' }],
        },
      },
    );

    const [result] = await this.itineraryModel.aggregate<{
      items: {
        _id: unknown;
        title: string;
        countries: string[];
        startDate: Date;
        ownerId: { toString(): string };
        updatedAt: Date;
        dayCount: number;
        cityIds: string[];
      }[];
      total: { n: number }[];
    }>(pipeline);

    const rows = result?.items ?? [];
    const total = result?.total[0]?.n ?? 0;

    // Author names and city names for the rows on this page
    const ownerIds = [...new Set(rows.map((row) => row.ownerId.toString()))];
    const allCityIds = [...new Set(rows.flatMap((row) => row.cityIds))];
    const [authors, cities] = await Promise.all([
      ownerIds.length
        ? this.userModel
            .find({ _id: { $in: ownerIds } })
            .select('name')
            .lean()
            .exec()
        : [],
      allCityIds.length
        ? this.cityModel
            .find({ cityId: { $in: allCityIds } })
            .lean()
            .exec()
        : [],
    ]);
    const authorNames = new Map(authors.map((a) => [String(a._id), a.name]));
    const cityNames = new Map(cities.map((c) => [c.cityId, c.name]));

    const items = rows.map((row) => ({
      _id: row._id,
      title: row.title,
      countries: row.countries,
      startDate: row.startDate,
      dayCount: row.dayCount,
      cities: [...new Set(row.cityIds)].map((cityId) => ({
        cityId,
        name: cityNames.get(cityId) ?? null,
      })),
      author: {
        _id: row.ownerId,
        name: authorNames.get(row.ownerId.toString()) ?? 'Deleted user',
      },
      updatedAt: row.updatedAt,
    }));

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ITN-21: one public itinerary, read-only (guests allowed)
  async findPublic(id: string) {
    const itinerary = await this.getPublicOrFail(id);
    const [author, plan] = await Promise.all([
      this.userModel.findById(itinerary.ownerId).select('name').lean().exec(),
      this.itineraries.loadPlanItems(itinerary._id),
    ]);

    // No viewer: amounts stay in their own currencies (conversion is for
    // the owner's own view)
    const { ownerId, ...view } = await this.itineraries.buildView(itinerary);
    return {
      ...view,
      author: { _id: ownerId, name: author?.name ?? 'Deleted user' },
      budgetTotals: sumByCurrency(toCostItems(plan)),
    };
  }

  // ITN-21: clone into an independent private copy that credits the author
  async clone(id: string, user: AuthUser) {
    const source = await this.getPublicOrFail(id);
    const author = await this.userModel
      .findById(source.ownerId)
      .select('name')
      .lean()
      .exec();

    const copy = await this.itineraryModel.create({
      ownerId: user.id,
      title: source.title,
      countries: [...source.countries],
      startDate: source.startDate,
      visibility: ItineraryVisibility.Private,
      // No _id here, so every day gets a new id
      days: source.days.map((day) => ({ cityId: day.cityId, notes: day.notes })),
      clonedFrom: {
        itineraryId: source._id,
        authorId: source.ownerId,
        authorName: author?.name ?? 'Deleted user',
      },
    });

    try {
      // Same order, so day i of the source is day i of the copy
      const dayIds = new Map(
        source.days.map((day, index) => [
          day._id.toString(),
          copy.days[index]._id,
        ]),
      );
      const plan = await this.itineraries.loadPlanItems(source._id);

      const activities = plan.activities.flatMap((a) => {
        const dayId = dayIds.get(a.dayId.toString());
        return dayId
          ? [
              {
                itineraryId: copy._id,
                dayId,
                name: a.name,
                description: a.description,
                time: a.time ?? null,
                cost: a.cost ?? null,
                currency: a.currency ?? null,
              },
            ]
          : [];
      });
      const budgetEntries = plan.budgetEntries.flatMap((b) => {
        const dayId = dayIds.get(b.dayId.toString());
        return dayId
          ? [
              {
                itineraryId: copy._id,
                dayId,
                category: b.category,
                amount: b.amount,
                currency: b.currency,
              },
            ]
          : [];
      });
      const transportCosts = plan.transportCosts.flatMap((t) => {
        const dayId = dayIds.get(t.dayId.toString());
        return dayId
          ? [
              {
                itineraryId: copy._id,
                dayId,
                mode: t.mode,
                fromCityId: t.fromCityId,
                toCityId: t.toCityId,
                amount: t.amount,
                currency: t.currency,
              },
            ]
          : [];
      });

      await Promise.all([
        this.activityModel.insertMany(activities),
        this.budgetModel.insertMany(budgetEntries),
        this.transportModel.insertMany(transportCosts),
      ]);
    } catch (error) {
      // Never leave a half-copied itinerary behind
      const filter = { itineraryId: copy._id };
      await Promise.all([
        this.itineraryModel.deleteOne({ _id: copy._id }),
        this.activityModel.deleteMany(filter),
        this.budgetModel.deleteMany(filter),
        this.transportModel.deleteMany(filter),
      ]);
      throw error;
    }

    return this.itineraries.buildView(copy, user);
  }

  // Public and not hidden, otherwise 404 (private ones are not revealed)
  private async getPublicOrFail(id: string): Promise<ItineraryDocument> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid itinerary id');
    }
    const itinerary = await this.itineraryModel.findById(id);
    if (
      !itinerary ||
      itinerary.visibility !== ItineraryVisibility.Public ||
      itinerary.isHidden
    ) {
      throw new NotFoundException('Itinerary not found');
    }
    const owner = await this.userModel
      .findById(itinerary.ownerId)
      .select('status')
      .lean()
      .exec();
    if (!owner || owner.status === AccountStatus.Deactivated) {
      throw new NotFoundException('Itinerary not found');
    }
    return itinerary;
  }
}