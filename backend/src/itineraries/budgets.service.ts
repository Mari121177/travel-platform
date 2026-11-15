import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { sumByCurrency, toCostItems } from './budget-summary';
import { CreateBudgetEntryDto } from './dto/create-budget-entry.dto';
import { UpdateBudgetEntryDto } from './dto/update-budget-entry.dto';
import { ItinerariesService } from './itineraries.service';
import { buildDayViews } from './itinerary-view';
import { budgetView } from './plan-items';
import {
  BudgetEntry,
  BudgetEntryDocument,
} from './schemas/budget-entry.schema';

/**
 * ITN-14: budget entries of an itinerary day, and the budget summary.
 * Only the owner may add, edit or delete entries.
 */
@Injectable()
export class BudgetsService {
  constructor(
    @InjectModel(BudgetEntry.name)
    private readonly budgetModel: Model<BudgetEntryDocument>,
    private readonly itinerariesService: ItinerariesService,
  ) {}

  async create(
    id: string,
    dayId: string,
    user: AuthUser,
    dto: CreateBudgetEntryDto,
  ) {
    const itinerary = await this.itinerariesService.getOwnedOrFail(id, user);
    this.itinerariesService.assertDayExists(itinerary, dayId);
    await this.itinerariesService.assertCurrencySupported(dto.currency);

    const entry = await this.budgetModel.create({
      itineraryId: itinerary._id,
      dayId: new Types.ObjectId(dayId),
      category: dto.category,
      amount: dto.amount,
      currency: dto.currency,
    });
    return budgetView(entry.toObject());
  }

  async update(id: string, user: AuthUser, dto: UpdateBudgetEntryDto) {
    // @IsOptional() lets null through, so reject explicit nulls here
    if (Object.values(dto).some((value) => value === null)) {
      throw new BadRequestException('Budget fields must not be null');
    }
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException('Send at least one field to change');
    }
    const entry = await this.getOrFail(id);
    await this.itinerariesService.getOwnedOrFail(
      entry.itineraryId.toString(),
      user,
    );

    if (dto.currency !== undefined) {
      await this.itinerariesService.assertCurrencySupported(dto.currency);
      entry.currency = dto.currency;
    }
    if (dto.category !== undefined) entry.category = dto.category;
    if (dto.amount !== undefined) entry.amount = dto.amount;

    await entry.save();
    return budgetView(entry.toObject());
  }

  async remove(id: string, user: AuthUser) {
    const entry = await this.getOrFail(id);
    await this.itinerariesService.getOwnedOrFail(
      entry.itineraryId.toString(),
      user,
    );
    await entry.deleteOne();
    return { message: 'Budget entry deleted' };
  }

  /**
   * ITN-14: the total budget broken down by category and by day. Budget
   * entries, activity costs (under "activities") and transport costs (under
   * "intercity_transport") are all included. Amounts in different currencies
   * are NOT added together yet: each currency has its own total. The
   * conversion into the user's currency comes with ITN-18.
   * A private itinerary is owner-only (404 for everyone else).
   */
  async getSummary(id: string, user: AuthUser) {
    const itinerary = await this.itinerariesService.getReadableOrFail(id, user);
    const plain = itinerary.toObject();
    const plan = await this.itinerariesService.loadPlanItems(itinerary._id);
    const items = toCostItems(plan);

    const days = buildDayViews(plain.startDate, plain.days, new Map());
    return {
      itineraryId: plain._id,
      byCurrency: sumByCurrency(items),
      byDay: days.map((day) => ({
        dayId: day._id,
        dayNumber: day.dayNumber,
        date: day.date,
        cityId: day.cityId,
        byCurrency: sumByCurrency(
          items.filter((item) => item.dayId === String(day._id)),
        ),
      })),
    };
  }

  private async getOrFail(id: string): Promise<BudgetEntryDocument> {
    const entry = await this.budgetModel.findById(id);
    if (!entry) throw new NotFoundException('Budget entry not found');
    return entry;
  }
}
