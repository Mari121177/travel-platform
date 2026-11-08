import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { RoomNightStatus } from '../hotel-booking.constants';

/**
 * One document per room per occupied night.
 * The UNIQUE index on (roomId, date) is what makes double booking impossible.
 * Only the hotel-bookings module writes this collection.
 */
@Schema({ collection: 'roomnights', timestamps: { createdAt: true, updatedAt: false } })
export class RoomNight {
  @Prop({ type: Types.ObjectId, required: true })
  roomId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  hotelId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  bookingId: Types.ObjectId;

  @Prop({ type: String, required: true })
  date: string; // "YYYY-MM-DD"

  @Prop({ type: String, enum: Object.values(RoomNightStatus), required: true })
  status: RoomNightStatus;

  @Prop({ type: Date, default: null })
  holdExpiresAt: Date | null;
}

export type RoomNightDocument = HydratedDocument<RoomNight>;
export const RoomNightSchema = SchemaFactory.createForClass(RoomNight);

RoomNightSchema.index({ roomId: 1, date: 1 }, { unique: true });
RoomNightSchema.index({ bookingId: 1 });
RoomNightSchema.index({ hotelId: 1, date: 1 });
RoomNightSchema.index({ status: 1, holdExpiresAt: 1 });
