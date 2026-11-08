import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BookingStatus } from '../hotel-booking.constants';

@Schema({ _id: false })
export class BookedRoom {
  @Prop({ type: Types.ObjectId, required: true })
  roomId: Types.ObjectId;

  @Prop({ type: String, required: true })
  roomNumber: string;

  @Prop({ type: String })
  roomType: string;

  // snapshot at booking time (HTL-05 / HTL-16)
  @Prop({ type: Number, required: true, min: 0 })
  pricePerNight: number;

  @Prop({ type: Number, required: true, min: 0 })
  adults: number;

  @Prop({ type: [Number], default: [] })
  childrenAges: number[];
}
const BookedRoomSchema = SchemaFactory.createForClass(BookedRoom);

@Schema({ _id: false })
export class CancellationTierSnapshot {
  @Prop({ type: Number, required: true })
  daysBefore: number;

  @Prop({ type: Number, required: true })
  refundPercent: number;
}
const CancellationTierSchema = SchemaFactory.createForClass(CancellationTierSnapshot);

@Schema({ collection: 'hotelbookings', timestamps: true })
export class HotelBooking {
  @Prop({ type: String, unique: true, sparse: true })
  reference?: string; // generated on confirmation (HTL-17)

  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  hotelId: Types.ObjectId;

  @Prop({ type: String, required: true })
  hotelName: string;

  @Prop({ type: String, required: true })
  checkIn: string; // "YYYY-MM-DD"

  @Prop({ type: String, required: true })
  checkOut: string; // exclusive

  @Prop({ type: Number, required: true })
  nights: number;

  @Prop({ type: [BookedRoomSchema], required: true })
  rooms: BookedRoom[];

  @Prop({ type: Number, required: true, min: 0 })
  totalPrice: number;

  @Prop({
    type: String,
    enum: Object.values(BookingStatus),
    default: BookingStatus.PendingPayment,
  })
  status: BookingStatus; // "Completed" is derived: Confirmed + checkOut passed

  @Prop({ type: Date, default: null })
  holdExpiresAt: Date | null;

  // policy snapshots (PAY-02 / HTL-21)
  @Prop({ type: [CancellationTierSchema], default: [] })
  cancellationTiers: CancellationTierSnapshot[];

  @Prop({ type: String })
  checkInTime?: string;

  @Prop({ type: String })
  checkOutTime?: string;

  // set by the payments module through service methods
  @Prop({ type: Date, default: null })
  policiesAcceptedAt: Date | null;

  @Prop({ type: String, default: null })
  paymentId: string | null;

  @Prop({ type: String, default: null })
  refundId: string | null;

  @Prop({ type: Date, default: null })
  cancelledAt: Date | null;

  @Prop({ type: Number, default: null })
  refundPercent: number | null;

  @Prop({ type: Number, default: null })
  refundAmount: number | null;
}

export type HotelBookingDocument = HydratedDocument<HotelBooking>;
export const HotelBookingSchema = SchemaFactory.createForClass(HotelBooking);

HotelBookingSchema.index({ userId: 1, createdAt: -1 });
HotelBookingSchema.index({ status: 1, holdExpiresAt: 1 });
HotelBookingSchema.index({ 'rooms.roomId': 1 });
