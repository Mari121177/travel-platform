import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { BookingType, PaymentStatus } from '../enums/payment.enums';
import { platformCurrency } from '../payments.constants';

export type PaymentDocument = HydratedDocument<Payment>;

/**
 * PAY-01: the payment for one booking.
 * Card details never reach the backend (Stripe Elements). Only the Stripe
 * payment ID, amount, currency and status are stored, plus the links to
 * the user, the booking and the accepted policies.
 */
@Schema({ timestamps: true, collection: 'payments' })
export class Payment {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(BookingType), required: true })
  bookingType!: BookingType;

  /** Id of the flight booking or hotel reservation. */
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  bookingId!: Types.ObjectId;

  /** Stripe PaymentIntent id (the Stripe payment ID). */
  @Prop({ type: String, required: true, unique: true })
  stripePaymentIntentId!: string;

  /** Taken from the booking on the server, never from the request body. */
  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  /** PAY-04: the platform currency (PLATFORM_CURRENCY in .env), stored uppercase. */
  @Prop({
    type: String,
    required: true,
    uppercase: true,
    match: /^[A-Z]{3}$/,
    default: () => platformCurrency(),
  })
  currency!: string;

  @Prop({
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
    index: true,
  })
  status!: PaymentStatus;

  /** PAY-02: the acceptance record (policies + timestamp) this payment relied on. */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'PolicyAcceptance', required: true })
  policyAcceptanceId!: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ bookingType: 1, bookingId: 1, createdAt: -1 });

// Safety net: a booking can never have two successful payments.
PaymentSchema.index(
  { bookingType: 1, bookingId: 1 },
  { unique: true, partialFilterExpression: { status: PaymentStatus.SUCCEEDED } },
);
