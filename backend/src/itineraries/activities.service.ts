import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ItinerariesService } from './itineraries.service';
import { activityView } from './plan-items';
import { Activity, ActivityDocument } from './schemas/activity.schema';
import { ActivityImagesService } from './activity-images.service';

const isNil = (value: unknown): value is null | undefined =>
  value === null || value === undefined;

/**
 * ITN-10: activities of an itinerary day. Only the owner of the itinerary may
 * add, edit or delete them. Someone else's private itinerary gives 404, their
 * public one gives 403 (same as ITN-01).
 */
@Injectable()
export class ActivitiesService {
  constructor(
    @InjectModel(Activity.name)
    private readonly activityModel: Model<ActivityDocument>,
    private readonly itinerariesService: ItinerariesService,
    private readonly activityImagesService: ActivityImagesService,
  ) {}

  async create(
    id: string,
    dayId: string,
    user: AuthUser,
    dto: CreateActivityDto,
  ) {
    const itinerary = await this.itinerariesService.getOwnedOrFail(id, user);
    this.itinerariesService.assertDayExists(itinerary, dayId);
    const money = await this.checkedMoney(dto.cost, dto.currency);

    const activity = await this.activityModel.create({
      itineraryId: itinerary._id,
      dayId: new Types.ObjectId(dayId),
      name: dto.name,
      description: dto.description,
      time: dto.time ?? null,
      ...money,
    });
    return activityView(activity.toObject());
  }

  async update(id: string, user: AuthUser, dto: UpdateActivityDto) {
    // @IsOptional() lets null through. Only time and cost may be cleared.
    if (dto.name === null || dto.description === null) {
      throw new BadRequestException('name and description must not be null');
    }
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException('Send at least one field to change');
    }
    const activity = await this.getOrFail(id);
    await this.itinerariesService.getOwnedOrFail(
      activity.itineraryId.toString(),
      user,
    );

    if (dto.name !== undefined) activity.name = dto.name;
    if (dto.description !== undefined) activity.description = dto.description;
    if (dto.time !== undefined) activity.time = dto.time;

    if (dto.cost !== undefined || dto.currency !== undefined) {
      const nextCost = dto.cost !== undefined ? dto.cost : activity.cost;
      // clearing the cost clears its currency too
      const nextCurrency =
        dto.currency !== undefined
          ? dto.currency
          : dto.cost === null
            ? null
            : activity.currency;
      const money = await this.checkedMoney(nextCost, nextCurrency);
      activity.cost = money.cost;
      activity.currency = money.currency;
    }

    await activity.save();
    return activityView(activity.toObject());
  }

  async remove(id: string, user: AuthUser) {
    const activity = await this.getOrFail(id);
    await this.itinerariesService.getOwnedOrFail(
      activity.itineraryId.toString(),
      user,
    );
    await activity.deleteOne();
    // ITN-12: the activity is gone, so its image files go too
    await this.activityImagesService.deleteUnusedFiles(activity.images);
    return { message: 'Activity deleted' };
  }

  private async getOrFail(id: string): Promise<ActivityDocument> {
    const activity = await this.activityModel.findById(id);
    if (!activity) throw new NotFoundException('Activity not found');
    return activity;
  }

  // A cost always comes with a currency, and a currency with a cost
  private async checkedMoney(
    cost: number | null | undefined,
    currency: string | null | undefined,
  ): Promise<{ cost: number | null; currency: string | null }> {
    if (isNil(cost) && isNil(currency)) return { cost: null, currency: null };
    if (isNil(cost)) throw new BadRequestException('A currency needs a cost');
    if (isNil(currency)) {
      throw new BadRequestException('A cost needs a currency');
    }
    await this.itinerariesService.assertCurrencySupported(currency);
    return { cost, currency };
  }
}
