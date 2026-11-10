import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/; // "HH:mm", 24-hour

// ---------- Cancellation tier (lives inside Hotel) — HTL-10 ----------
// Refund rule (same as FLT-09): use the tier with the HIGHEST daysBefore
// that is <= days remaining before check-in. No tier applies -> 0%.
@Schema({ _id: false })
export class CancellationTier {
  @Prop({ required: true, min: 0 })
  daysBefore: number; // integer >= 0, unique within the hotel (checked in DTO)

  @Prop({ required: true, min: 0, max: 100 })
  refundPercent: number;
}
export const CancellationTierSchema =
  SchemaFactory.createForClass(CancellationTier);

// ---------- Hotel ----------
// Moderator link lives on the User (user.assignedProviderId), NOT here.
// Prices use the single platform currency (PAY-04), so no currency field.
@Schema({ timestamps: true })
export class Hotel {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  address: string;

  @Prop({ required: true })
  cityId: string; // matches City.cityId in the seeded reference data, e.g. "cairo"

  @Prop({ required: true })
  countryCode: string; // set by the service from the city, NOT from user input

  @Prop({ default: '' })
  description: string;

  @Prop({ type: [String], default: [] })
  photos: string[]; // max 5 (GEN-08), checked in DTO

  @Prop({ min: 1, max: 5 })
  starClass: number;

  @Prop({ type: [String], default: [] })
  amenities: string[];

  @Prop({ match: TIME_REGEX })
  checkInTime: string; // HTL-09

  @Prop({ match: TIME_REGEX })
  checkOutTime: string; // HTL-09

  @Prop({ type: [CancellationTierSchema], default: [] })
  cancellationTiers: CancellationTier[];

  @Prop({ default: 0, min: 0, max: 5 })
  ratingAvg: number; // kept updated by member 6 via updateRating()

  @Prop({ default: 0, min: 0 })
  ratingCount: number; // 0 = unrated -> excluded when a rating filter is set (HTL-12)

  // false = deactivated by admin (ACC-15) -> hidden from search, can't be booked
  @Prop({ default: true })
  isActive: boolean;
}

export type HotelDocument = HydratedDocument<Hotel>;
export const HotelSchema = SchemaFactory.createForClass(Hotel);

HotelSchema.index({ cityId: 1, isActive: 1 });
HotelSchema.index({ countryCode: 1, isActive: 1 });
HotelSchema.index({ name: 'text' });
