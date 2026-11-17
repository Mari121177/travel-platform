import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { Airline, AirlineDocument } from './airline.schema';
import { CreateAirlineDto, UpdateAirlineDto } from './dto/airline.dto';
import { BaggagePolicyDto, CancellationPolicyDto } from './dto/airline-policy.dto';

@Injectable()
export class AirlinesService {
  constructor(@InjectModel(Airline.name) private readonly model: Model<AirlineDocument>) {}

  /** A moderator may manage ONLY their assigned airline (GEN-13, ACC-11). */
  assertManages(airline: { _id: unknown }, user: AuthUser) {
    if (user.role !== Role.AirlineModerator || user.assignedProviderId !== String(airline._id)) {
      throw new ForbiddenException('You can only manage your own airline');
    }
  }

  // FLT-01: admin creates an airline profile
  async create(dto: CreateAirlineDto) {
    try {
      return await this.model.create({ ...dto, code: dto.code.toUpperCase() });
    } catch (e: any) {
      if (e.code === 11000) throw new ConflictException('Airline name or code already exists');
      throw e;
    }
  }

  async findOne(id: string) {
    if (!isValidObjectId(id)) throw new BadRequestException('Invalid airline id');
    const airline = await this.model.findById(id).lean();
    if (!airline) throw new NotFoundException('Airline not found');
    return airline;
  }

  // ACC-13: admin loads an airline (active OR deactivated) to create a moderator.
  async findAirlineForAdmin(airlineId: string): Promise<AirlineDocument> {
    if (!isValidObjectId(airlineId)) {
      throw new BadRequestException('Invalid airline id');
    }
    const airline = await this.model.findById(airlineId);
    if (!airline) {
      throw new NotFoundException('Airline not found');
    }
    return airline;
  }

  // FLT-01: moderator edits their own airline (name, code, logo)
  async update(id: string, dto: UpdateAirlineDto, user: AuthUser) {
    this.assertManages(await this.findOne(id), user);
    if (dto.code) dto.code = dto.code.toUpperCase();
    try {
      return await this.model.findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true });
    } catch (e: any) {
      if (e.code === 11000) throw new ConflictException('Airline name or code already exists');
      throw e;
    }
  }

  // FLT-08: price per extra bag and max extra bags per passenger
  async setBaggagePolicy(id: string, dto: BaggagePolicyDto, user: AuthUser) {
    this.assertManages(await this.findOne(id), user);
    return this.model.findByIdAndUpdate(
      id,
      { $set: { extraBagPrice: dto.extraBagPrice, maxExtraBags: dto.maxExtraBags } },
      { new: true, runValidators: true },
    );
  }

  // FLT-09: cancellation tiers (replaces the whole list)
  async setCancellationPolicy(id: string, dto: CancellationPolicyDto, user: AuthUser) {
    this.assertManages(await this.findOne(id), user);
    const days = dto.tiers.map((t) => t.daysBeforeDeparture);
    if (new Set(days).size !== days.length) {
      throw new BadRequestException('Each daysBeforeDeparture threshold must be unique');
    }
    const tiers = [...dto.tiers].sort((a, b) => b.daysBeforeDeparture - a.daysBeforeDeparture);
    return this.model.findByIdAndUpdate(
      id,
      { $set: { cancellationTiers: tiers } },
      { new: true, runValidators: true },
    );
  }

  /** For Mariam's admin deactivate/reactivate endpoints (ACC-15) */
  async setActive(airlineId: string, isActive: boolean) {
    const airline = await this.model.findByIdAndUpdate(airlineId, { $set: { isActive } }, { new: true });
    if (!airline) throw new NotFoundException('Airline not found');
    return airline;
  }
}
