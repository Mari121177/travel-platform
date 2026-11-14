import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { City, CityDocument } from '../reference-data/schemas/city.schema';
import {
  Country,
  CountryDocument,
} from '../reference-data/schemas/country.schema';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { ListItinerariesQueryDto } from './dto/list-itineraries-query.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';
import { ITINERARIES_PAGE_SIZE } from './itinerary.constants';
import { buildDayViews, groupDaysByCity } from './itinerary-view';
import {
  Itinerary,
  ItineraryDocument,
  ItineraryVisibility,
} from './schemas/itinerary.schema';

@Injectable()
export class ItinerariesService {
  constructor(
    @InjectModel(Itinerary.name)
    private readonly itineraryModel: Model<ItineraryDocument>,
    @InjectModel(Country.name)
    private readonly countryModel: Model<CountryDocument>,
    @InjectModel(City.name)
    private readonly cityModel: Model<CityDocument>,
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
    const itinerary = await this.getOrFail(id);
    if (
      itinerary.visibility === ItineraryVisibility.Private &&
      itinerary.ownerId.toString() !== user.id
    ) {
      throw new NotFoundException('Itinerary not found');
    }
    return this.buildView(itinerary);
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

    return this.buildView(await itinerary.save());
  }

  // ITN-01 delete
  async remove(id: string, user: AuthUser) {
    const itinerary = await this.getOwnedOrFail(id, user);
    await itinerary.deleteOne();
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
   * The itinerary with its days numbered and dated, and the days grouped by
   * city (ITN-05, ITN-09). Use this whenever an itinerary is sent to the client.
   */
  async buildView(itinerary: ItineraryDocument) {
    const plain = itinerary.toObject();
    const cityIds = [...new Set(plain.days.map((day) => day.cityId))];
    const cities = cityIds.length
      ? await this.cityModel
          .find({ cityId: { $in: cityIds } })
          .lean()
          .exec()
      : [];
    const cityNames = new Map(cities.map((city) => [city.cityId, city.name]));

    const days = buildDayViews(plain.startDate, plain.days, cityNames);
    return { ...plain, days, cityGroups: groupDaysByCity(days) };
  }

  // Only the owner may change or delete (GEN-13)
  async getOwnedOrFail(id: string, user: AuthUser): Promise<ItineraryDocument> {
    const itinerary = await this.getOrFail(id);
    if (itinerary.ownerId.toString() !== user.id) {
      if (itinerary.visibility === ItineraryVisibility.Private) {
        throw new NotFoundException('Itinerary not found');
      }
      throw new ForbiddenException('You do not own this itinerary');
    }
    return itinerary;
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
