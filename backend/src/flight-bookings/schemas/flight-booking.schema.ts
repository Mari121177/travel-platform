import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { FlightBookingStatus } from '../enums/flight-booking-status.enum';

@Schema({ _id: false })
export class ExtraBag {
  @Prop({ required: true })
  weightKg: number;
}
export const ExtraBagSchema = SchemaFactory.createForClass(ExtraBag);

@Schema({ _id: false })
export class BookingPassenger {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  dateOfBirth: string;

  @Prop({ required: true })
  passportNumber: string;

  @Prop({ default: 'adult' })
  type: string;

  @Prop({ type: [ExtraBagSchema], default: [] })
  extraBags: ExtraBag[];
}
export const BookingPassengerSchema =
  SchemaFactory.createForClass(BookingPassenger);

@Schema({ timestamps: true, collection: 'flight_bookings' })
export class FlightBooking {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  flightId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, default: null })
  returnFlightId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, default: null })
  airlineId: Types.ObjectId | null;

  // Copied from the flight when the hold is created, so admin lists (ACC-17)
  // and the account-deletion check (ACC-12) only need this collection.
  @Prop({ type: String, default: null })
  flightNumber: string | null;

  @Prop({ type: String, default: null })
  airlineName: string | null;

  @Prop({ type: String, default: null })
  origin: string | null; // IATA code

  @Prop({ type: String, default: null })
  destination: string | null; // IATA code

  @Prop({ type: Date, default: null })
  departureTime: Date | null; // outbound departure

  @Prop({ type: Date, default: null })
  arrivalTime: Date | null; // last arrival (return leg for round trips)

  @Prop({ required: true })
  cabinClass: string;

  @Prop({ type: [BookingPassengerSchema], required: true })
  passengers: BookingPassenger[];

  // Agreed prices, stored at hold time (platform currency)
  @Prop({ required: true })
  baseFare: number;

  @Prop({ default: 0 })
  baggageFee: number;

  @Prop({ required: true })
  totalPrice: number;

  @Prop({
    type: String,
    enum: Object.values(FlightBookingStatus),
    default: FlightBookingStatus.PendingPayment,
    index: true,
  })
  status: FlightBookingStatus;

  // Set only when the booking is confirmed (FLT-23)
  @Prop({ type: String, unique: true, sparse: true })
  reference?: string;

  @Prop({ type: Date, default: null })
  holdExpiresAt: Date | null;

  @Prop({ type: Date, default: null })
  policiesAcceptedAt: Date | null;

  @Prop({ type: String, default: null })
  paymentId: string | null;

  @Prop({ type: Date, default: null })
  cancelledAt: Date | null;

  @Prop({ type: Number, default: null })
  refundPercent: number | null;

  @Prop({ type: Number, default: null })
  refundAmount: number | null;

  @Prop({ type: String, default: null })
  refundId: string | null;
}

export type FlightBookingDocument = HydratedDocument<FlightBooking>;
export const FlightBookingSchema = SchemaFactory.createForClass(FlightBooking);