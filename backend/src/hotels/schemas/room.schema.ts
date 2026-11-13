import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// IMPORTANT convention for ALL ranges below (agreed with member 6):
// start = first night, end = LAST NIGHT (inclusive), NOT the check-out day.
// Check-in Dec 10, check-out Dec 13  ->  { start: "2026-12-10", end: "2026-12-12" }
// Booked nights are NOT stored here: they live in member 6's "roomnights" collection.

// ---------- Availability / blocked range (lives inside Room) ----------
// Keeps its _id on purpose so a specific range can be edited/removed by id.
@Schema()
export class DateRange {
  @Prop({ required: true, match: DATE_REGEX })
  start: string;

  @Prop({ required: true, match: DATE_REGEX })
  end: string;
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
  type: string; // e.g. "Single", "Double", "Suite"

  @Prop({ required: true, min: 1 })
  beds: number;

  @Prop({ required: true, min: 1 })
  maxOccupancy: number;

  @Prop({ required: true, min: 0.01 })
  pricePerNight: number;

  @Prop({ default: true })
  isActive: boolean;

  // 🟢 nights the hotel is selling this room (HTL-04)
  @Prop({ type: [DateRangeSchema], default: [] })
  availabilityRanges: DateRange[];

  // 🔴 nights the room can't be sold (HTL-06)
  @Prop({ type: [DateRangeSchema], default: [] })
  blockedRanges: DateRange[];
}

export type RoomDocument = HydratedDocument<Room>;
export const RoomSchema = SchemaFactory.createForClass(Room);

RoomSchema.index({ hotelId: 1, roomNumber: 1 }, { unique: true });
