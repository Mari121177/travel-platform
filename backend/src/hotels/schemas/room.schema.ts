import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ---------- Date range (lives inside Room) ----------
@Schema()
export class DateRange {
  @Prop({ required: true, match: DATE_REGEX })
  start: string; // "YYYY-MM-DD", first night

  @Prop({ required: true, match: DATE_REGEX })
  end: string;   // "YYYY-MM-DD", last night (inclusive)
}
export const DateRangeSchema = SchemaFactory.createForClass(DateRange);

// ---------- Room ----------
@Schema({ timestamps: true })
export class Room {
  @Prop({ type: Types.ObjectId, ref: 'Hotel', required: true })
  hotelId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  roomNumber: string;

  @Prop({ required: true, trim: true })
  type: string;

  @Prop({ required: true, min: 1 })
  beds: number;

  @Prop({ required: true, min: 1 })
  maxOccupancy: number;

  @Prop({ required: true, min: 0.01 })
  pricePerNight: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [DateRangeSchema], default: [] })
  availabilityRanges: DateRange[];

  @Prop({ type: [DateRangeSchema], default: [] })
  blockedRanges: DateRange[];
}

export type RoomDocument = HydratedDocument<Room>;
export const RoomSchema = SchemaFactory.createForClass(Room);

RoomSchema.index({ hotelId: 1, roomNumber: 1 }, { unique: true });