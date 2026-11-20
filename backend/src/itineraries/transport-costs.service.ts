import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreateTransportCostDto } from './dto/create-transport-cost.dto';
import { UpdateTransportCostDto } from './dto/update-transport-cost.dto';
import { ItinerariesService } from './itineraries.service';
import { transportView } from './plan-items';
import {
  TransportCost,
  TransportCostDocument,
} from './schemas/transport-cost.schema';

/**
 * ITN-16: intercity transport costs of an itinerary. Only the owner may add,
 * edit or delete them.
 */
@Injectable()
export class TransportCostsService {
  constructor(
    @InjectModel(TransportCost.name)
    private readonly transportModel: Model<TransportCostDocument>,
    private readonly itinerariesService: ItinerariesService,
  ) {}

  async create(id: string, user: AuthUser, dto: CreateTransportCostDto) {
    const itinerary = await this.itinerariesService.getOwnedOrFail(id, user);
    this.itinerariesService.assertDayExists(itinerary, dto.dayId);
    await this.itinerariesService.assertCityExists(dto.fromCityId);
    await this.itinerariesService.assertCityExists(dto.toCityId);
    await this.itinerariesService.assertCurrencySupported(dto.currency);

    const cost = await this.transportModel.create({
      itineraryId: itinerary._id,
      dayId: new Types.ObjectId(dto.dayId),
      mode: dto.mode,
      fromCityId: dto.fromCityId,
      toCityId: dto.toCityId,
      amount: dto.amount,
      currency: dto.currency,
    });
    return transportView(cost.toObject());
  }

  async update(id: string, user: AuthUser, dto: UpdateTransportCostDto) {
    // @IsOptional() lets null through, so reject explicit nulls here
    if (Object.values(dto).some((value) => value === null)) {
      throw new BadRequestException('Transport cost fields must not be null');
    }
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException('Send at least one field to change');
    }
    const cost = await this.getOrFail(id);
    const itinerary = await this.itinerariesService.getOwnedOrFail(
      cost.itineraryId.toString(),
      user,
    );

    if (dto.dayId !== undefined) {
      this.itinerariesService.assertDayExists(itinerary, dto.dayId);
      cost.dayId = new Types.ObjectId(dto.dayId);
    }
    if (dto.fromCityId !== undefined) {
      await this.itinerariesService.assertCityExists(dto.fromCityId);
      cost.fromCityId = dto.fromCityId;
    }
    if (dto.toCityId !== undefined) {
      await this.itinerariesService.assertCityExists(dto.toCityId);
      cost.toCityId = dto.toCityId;
    }
    if (dto.currency !== undefined) {
      await this.itinerariesService.assertCurrencySupported(dto.currency);
      cost.currency = dto.currency;
    }
    if (dto.mode !== undefined) cost.mode = dto.mode;
    if (dto.amount !== undefined) cost.amount = dto.amount;

    await cost.save();
    return transportView(cost.toObject());
  }

  async remove(id: string, user: AuthUser) {
    const cost = await this.getOrFail(id);
    await this.itinerariesService.getOwnedOrFail(
      cost.itineraryId.toString(),
      user,
    );
    await cost.deleteOne();
    return { message: 'Transport cost deleted' };
  }

  private async getOrFail(id: string): Promise<TransportCostDocument> {
    const cost = await this.transportModel.findById(id);
    if (!cost) throw new NotFoundException('Transport cost not found');
    return cost;
  }
}
