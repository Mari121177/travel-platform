import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { BookingType, RefundReason, RefundStatus } from '../enums/payment.enums';
import { PLATFORM_CURRENCY } from '../payments.constants';

export type RefundDocument = HydratedDocument<Refund>;

/**
 * PAY-03: a refund issued through the Stripe Refunds API.
 * Created only when the refund amount is positive. A refund that failed at
 * Stripe is still saved (status Failed) so it can be retried.
 */
@Schema({ timestamps: true, collection: 'refunds' })
export class Refund {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Payment', required: true, index: true })
  paymentId!: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(BookingType), required: true })
  bookingType!: BookingType;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  bookingId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0.01 })
  amount!: number;

  /** PAY-04: always the single platform currency. */
  @Prop({
    type: String,
    required: true,
    enum: [PLATFORM_CURRENCY],
    default: PLATFORM_CURRENCY,
  })
  currency!: string;

  /** Shown on the booking details: Pending, Refunded or Failed. */
  @Prop({
    type: String,
    enum: Object.values(RefundStatus),
    default: RefundStatus.PENDING,
  })
  status!: RefundStatus;

  @Prop({ type: String, enum: Object.values(RefundReason), required: true })
  reason!: RefundReason;

  /** Stripe Refund id. */
  @Prop({ type: String, unique: true, sparse: true })
  stripeRefundId?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const RefundSchema = SchemaFactory.createForClass(Refund);

// A booking can never be refunded twice.
RefundSchema.index({ bookingType: 1, bookingId: 1 }, { unique: true });
