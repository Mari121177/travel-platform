import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import {
  Country,
  CountryDocument,
} from '../reference-data/schemas/country.schema';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { ListItinerariesQueryDto } from './dto/list-itineraries-query.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';
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

  // ITN-03: the logged-in user's own itineraries
  async findMine(userId: string, query: ListItinerariesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const filter = { ownerId: userId };

    const [items, total] = await Promise.all([
      this.itineraryModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.itineraryModel.countDocuments(filter),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ITN-03: one itinerary. Private ones are owner-only.
  async findOne(id: string, user: AuthUser) {
    const itinerary = await this.getOrFail(id);
    if (
      itinerary.visibility === ItineraryVisibility.Private &&
      itinerary.ownerId.toString() !== user.id
    ) {
      throw new ForbiddenException('This itinerary is private');
    }
    return itinerary;
  }

  // ITN-01 edit, ITN-20 visibility
  async update(id: string, user: AuthUser, dto: UpdateItineraryDto) {
    const itinerary = await this.getOwnedOrFail(id, user);

    if (dto.countries) {
      await this.assertCountriesExist(dto.countries);
      itinerary.countries = dto.countries;
    }
    if (Object.values(dto).some((value) => value === null)) {
      throw new BadRequestException('Itinerary fields must not be null');
    }
    if (dto.title !== undefined) itinerary.title = dto.title;
    if (dto.startDate !== undefined) itinerary.startDate = new Date(dto.startDate);
    if (dto.visibility !== undefined) itinerary.visibility = dto.visibility;

    return itinerary.save();
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

  // Only the owner may change or delete (GEN-13)
  private async getOwnedOrFail(
    id: string,
    user: AuthUser,
  ): Promise<ItineraryDocument> {
    const itinerary = await this.getOrFail(id);
    if (itinerary.ownerId.toString() !== user.id) {
      throw new ForbiddenException('You do not own this itinerary');
    }
    return itinerary;
  }

  private async assertCountriesExist(codes: string[]) {
    const found = await this.countryModel.countDocuments({
      code: { $in: codes },
    });
    if (found !== codes.length) {
      throw new BadRequestException('One or more country codes are not supported');
    }
  }
}