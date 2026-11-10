import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { BookingType } from '../enums/payment.enums';

export type PolicyAcceptanceDocument = HydratedDocument<PolicyAcceptance>;

/**
 * Proof that a user accepted the provider's policies before paying (PAY-02).
 * Stored with a timestamp, as the project description requires.
 */
@Schema({ timestamps: true, collection: 'policy_acceptances' })
export class PolicyAcceptance {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(BookingType), required: true })
  bookingType!: BookingType;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  bookingId!: Types.ObjectId;

  /** Exact copy of the policies the user saw and accepted. */
  @Prop({ type: SchemaTypes.Mixed, required: true })
  policies!: Record<string, unknown>;

  @Prop({ type: Date, required: true, default: () => new Date() })
  acceptedAt!: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PolicyAcceptanceSchema =
  SchemaFactory.createForClass(PolicyAcceptance);

// One acceptance record per user per booking (accepting again updates it).
PolicyAcceptanceSchema.index(
  { userId: 1, bookingType: 1, bookingId: 1 },
  { unique: true },
);
