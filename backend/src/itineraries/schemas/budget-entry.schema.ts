import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { BudgetCategory } from '../itinerary.constants';

export type BudgetEntryDocument = HydratedDocument<BudgetEntry>;

/** ITN-14: one planned amount for one day, in the currency the user chose. */
@Schema({ timestamps: true, collection: 'budget_entries' })
export class BudgetEntry {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Itinerary',
    required: true,
    index: true,
  })
  itineraryId!: Types.ObjectId;

  // The _id of a day inside itinerary.days
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  dayId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(BudgetCategory),
    required: true,
  })
  category!: BudgetCategory;

  @Prop({ type: Number, min: 0, required: true })
  amount!: number;

  @Prop({ type: String, uppercase: true, required: true })
  currency!: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const BudgetEntrySchema = SchemaFactory.createForClass(BudgetEntry);

BudgetEntrySchema.index({ itineraryId: 1, dayId: 1 });
