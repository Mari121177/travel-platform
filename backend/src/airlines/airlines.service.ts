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

  /** For Mariam's admin deactivate/reactivate endpoints (ACC-15) */
  async setActive(airlineId: string, isActive: boolean) {
    const airline = await this.model.findByIdAndUpdate(airlineId, { $set: { isActive } }, { new: true });
    if (!airline) throw new NotFoundException('Airline not found');
    return airline;
  }
}
