import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })

export class CancellationTier {
  @Prop({ required: true, min: 0 })
  daysBefore: number;

  @Prop({ required: true, min: 0, max: 100 }) //percentage
  refundPercent: number;

}

export const CancellationTierSchema = SchemaFactory.createForClass(CancellationTier);


@Schema({ timestamps: true })
export class Hotel {
  @Prop({ required: true, trim: true })
  name: string;

   @Prop({ required: true, trim: true })
  address: string;

  @Prop({ required: true })
  cityId: string;

   @Prop({ required: true })
  countryCode: string;

   @Prop({ default: '' })
  description: string;

    @Prop({ type: [String], default: [] })
  photos: string[];
  
   @Prop({ min: 1, max: 5 })
  starClass: number;

    @Prop({ type: [String], default: [] })
  amenities: string[];

    @Prop({ match: /^([01]\d|2[0-3]):[0-5]\d$/ })
  checkInTime: string;

    @Prop({ match: /^([01]\d|2[0-3]):[0-5]\d$/ })
  checkOutTime: string;

    @Prop({ type: [CancellationTierSchema], default: [] })
  cancellationTiers: CancellationTier[];

    @Prop({ default: 0 })
  ratingAvg: number;

    @Prop({ default: 0 })
  ratingCount: number;

    @Prop({ default: true })
  isActive: boolean;
}
export type HotelDocument = HydratedDocument<Hotel>;

export const HotelSchema = SchemaFactory.createForClass(Hotel);
HotelSchema.index({ cityId: 1, isActive: 1 });
HotelSchema.index({ countryCode: 1, isActive: 1 });