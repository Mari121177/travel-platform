import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { City, CityDocument } from '../reference-data/schemas/city.schema';
import { AddDayDto } from './dto/add-day.dto';
import { ReorderDayDto } from './dto/reorder-day.dto';
import { UpdateDayDto } from './dto/update-day.dto';
import { ItinerariesService } from './itineraries.service';
import { MAX_ITINERARY_DAYS } from './itinerary.constants';
import { Itinerary, ItineraryDocument } from './schemas/itinerary.schema';

/**
 * ITN-05, ITN-07, ITN-08. Every change is ONE atomic database update on the
 * itinerary document, so two requests at the same time cannot overwrite each
 * other or push the itinerary over 60 days.
 * Day numbers, dates and city groups are derived when the itinerary is read
 * (see itinerary-view.ts), so there is nothing to renumber by hand.
 */
@Injectable()
export class ItineraryDaysService {
  constructor(
    @InjectModel(Itinerary.name)
    private readonly itineraryModel: Model<ItineraryDocument>,
    @InjectModel(City.name)
    private readonly cityModel: Model<CityDocument>,
    private readonly itinerariesService: ItinerariesService,
  ) {}

  // ITN-05: add a day at the end
  async addDay(id: string, user: AuthUser, dto: AddDayDto) {
    await this.itinerariesService.getOwnedOrFail(id, user);
    await this.assertCityExists(dto.cityId);

    const updated = await this.itineraryModel
      .findOneAndUpdate(
        {
          _id: id,
          ownerId: user.id,
          // fewer than 60 days now, checked in the same atomic update
          $expr: { $lt: [{ $size: '$days' }, MAX_ITINERARY_DAYS] },
        },
        {
          $push: {
            days: {
              _id: new Types.ObjectId(),
              cityId: dto.cityId,
              notes: dto.notes ?? '',
            },
          },
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      // Not found any more, or already full
      const stillThere = await this.itineraryModel.exists({
        _id: id,
        ownerId: user.id,
      });
      if (!stillThere) {
        throw new NotFoundException('Itinerary not found');
      }
      throw new BadRequestException(
        `An itinerary can have at most ${MAX_ITINERARY_DAYS} days`,
      );
    }
    return this.itinerariesService.buildView(updated);
  }

  // ITN-05: edit a day's city and notes
  async updateDay(
    id: string,
    dayId: string,
    user: AuthUser,
    dto: UpdateDayDto,
  ) {
    // @IsOptional() lets null through, so reject explicit nulls here
    if (Object.values(dto).some((value) => value === null)) {
      throw new BadRequestException('Day fields must not be null');
    }
    if (dto.cityId === undefined && dto.notes === undefined) {
      throw new BadRequestException('Send cityId, notes, or both');
    }
    await this.itinerariesService.getOwnedOrFail(id, user);

    const set: Record<string, string> = {};
    if (dto.cityId !== undefined) {
      await this.assertCityExists(dto.cityId);
      set['days.$.cityId'] = dto.cityId;
    }
    if (dto.notes !== undefined) {
      set['days.$.notes'] = dto.notes;
    }

    const updated = await this.itineraryModel
      .findOneAndUpdate(
        { _id: id, ownerId: user.id, 'days._id': dayId },
        { $set: set },
        { new: true },
      )
      .exec();
    if (!updated) {
      throw new NotFoundException('Day not found');
    }
    return this.itinerariesService.buildView(updated);
  }

  // ITN-07: delete a day. The days after it move up one number, and their
  // dates move with them (derived, see itinerary-view.ts).
  async removeDay(id: string, dayId: string, user: AuthUser) {
    await this.itinerariesService.getOwnedOrFail(id, user);

    const updated = await this.itineraryModel
      .findOneAndUpdate(
        { _id: id, ownerId: user.id, 'days._id': dayId },
        { $pull: { days: { _id: new Types.ObjectId(dayId) } } },
        { new: true },
      )
      .exec();
    if (!updated) {
      throw new NotFoundException('Day not found');
    }
    // TODO ITN-10, ITN-14, ITN-16: also delete this day's activities, budget
    // entries and transport costs once those exist
    return this.itinerariesService.buildView(updated);
  }

  // ITN-08: move a day to a new position (1 = first day)
  async reorderDay(id: string, user: AuthUser, dto: ReorderDayDto) {
    const itinerary = await this.itinerariesService.getOwnedOrFail(id, user);
    if (dto.position > itinerary.days.length) {
      throw new BadRequestException(
        `position must be between 1 and ${itinerary.days.length}`,
      );
    }

    const dayId = new Types.ObjectId(dto.dayId);
    const index = dto.position - 1;

    // ONE atomic update that takes the day out of the array and puts it back
    // at the new index. A day added or deleted at the same time is never lost.
    const updated = await this.itineraryModel
      .findOneAndUpdate(
        { _id: id, ownerId: user.id, 'days._id': dayId },
        [
          {
            $set: {
              days: {
                $let: {
                  vars: {
                    moving: {
                      $filter: {
                        input: '$days',
                        cond: { $eq: ['$$this._id', dayId] },
                      },
                    },
                    rest: {
                      $filter: {
                        input: '$days',
                        cond: { $ne: ['$$this._id', dayId] },
                      },
                    },
                  },
                  in: {
                    $concatArrays: [
                      { $slice: ['$$rest', index] },
                      '$$moving',
                      { $slice: ['$$rest', index, MAX_ITINERARY_DAYS] },
                    ],
                  },
                },
              },
            },
          },
        ],
        { new: true, updatePipeline: true },
      )
      .exec();
    if (!updated) {
      throw new NotFoundException('Day not found');
    }
    return this.itinerariesService.buildView(updated);
  }

  // ITN-09: every day needs a city from the seeded list
  private async assertCityExists(cityId: string) {
    const found = await this.cityModel.exists({ cityId });
    if (!found) {
      throw new BadRequestException(`City "${cityId}" is not supported`);
    }
  }
}
