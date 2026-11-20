import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AccountStatus } from '../common/enums/account-status.enum';
import { Hotel } from '../hotels/schemas/hotel.schema';
import {
  Itinerary,
  ItineraryVisibility,
} from '../itineraries/schemas/itinerary.schema';
import { User } from '../users/schemas/user.schema';
import { CreateFavoriteDto } from './dto/favorite.dto';
import {
  Favorite,
  FavoriteType,
} from './schemas/favorite.schema';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectModel(Favorite.name) private readonly favoriteModel: Model<Favorite>,
    @InjectModel(Hotel.name) private readonly hotelModel: Model<Hotel>,
    @InjectModel(Itinerary.name)
    private readonly itineraryModel: Model<Itinerary>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async add(userId: string, dto: CreateFavoriteDto) {
    await this.assertTargetExists(dto.type, dto.targetId);
    try {
      return await this.favoriteModel.create({
        userId: new Types.ObjectId(userId),
        type: dto.type,
        targetId: new Types.ObjectId(dto.targetId),
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException('This item is already in your favourites');
      }
      throw error;
    }
  }

  async list(userId: string) {
    const favorites = await this.favoriteModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const hotelIds = favorites
      .filter((f) => f.type === FavoriteType.Hotel)
      .map((f) => f.targetId);
    const itineraryIds = favorites
      .filter((f) => f.type === FavoriteType.Itinerary)
      .map((f) => f.targetId);
    const [hotels, itineraries] = await Promise.all([
      hotelIds.length
        ? this.hotelModel
            .find({ _id: { $in: hotelIds }, isActive: true })
            .select('name photos')
            .lean()
            .exec()
        : [],
      itineraryIds.length
        ? this.itineraryModel
            .find({
              _id: { $in: itineraryIds },
              visibility: ItineraryVisibility.Public,
              isHidden: { $ne: true },
            })
            .select('title countries startDate')
            .lean()
            .exec()
        : [],
    ]);
    const hotelById = new Map(hotels.map((h) => [String(h._id), h]));
    const itineraryById = new Map(
      itineraries.map((i) => [String(i._id), i]),
    );

    return {
      items: favorites.map((f) => {
        const id = String(f.targetId);
        if (f.type === FavoriteType.Hotel) {
          const hotel = hotelById.get(id);
          return {
            type: f.type,
            targetId: id,
            name: hotel?.name ?? null,
            photos: hotel?.photos ?? [],
            available: !!hotel,
            createdAt: f.createdAt,
          };
        }
        const itinerary = itineraryById.get(id);
        return {
          type: f.type,
          targetId: id,
          title: itinerary?.title ?? null,
          countries: itinerary?.countries ?? [],
          startDate: itinerary?.startDate ?? null,
          available: !!itinerary,
          createdAt: f.createdAt,
        };
      }),
    };
  }

  async remove(userId: string, type: FavoriteType, targetId: string) {
    const result = await this.favoriteModel
      .deleteOne({
        userId: new Types.ObjectId(userId),
        type,
        targetId: new Types.ObjectId(targetId),
      })
      .exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Favourite not found');
    }
    return { deleted: true };
  }

  private async assertTargetExists(type: FavoriteType, targetId: string) {
    if (type === FavoriteType.Hotel) {
      const hotel = await this.hotelModel
        .findOne({ _id: targetId, isActive: true })
        .select('_id')
        .lean()
        .exec();
      if (!hotel) throw new NotFoundException('Hotel not found');
      return;
    }

    const itinerary = await this.itineraryModel
      .findOne({
        _id: targetId,
        visibility: ItineraryVisibility.Public,
        isHidden: { $ne: true },
      })
      .select('ownerId')
      .lean()
      .exec();
    if (!itinerary) throw new NotFoundException('Public itinerary not found');
    const owner = await this.userModel
      .findOne({
        _id: itinerary.ownerId,
        status: { $ne: AccountStatus.Deactivated },
      })
      .select('_id')
      .lean()
      .exec();
    if (!owner) throw new NotFoundException('Public itinerary not found');
  }
}
