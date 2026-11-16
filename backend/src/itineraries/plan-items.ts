import type { Types } from 'mongoose';
import type { BudgetCategory, TransportMode } from './itinerary.constants';

/**
 * The things a user plans inside an itinerary, as read from the database
 * (activities ITN-10, budget entries ITN-14, transport costs ITN-16).
 */
export interface ActivityItem {
  _id: Types.ObjectId;
  dayId: Types.ObjectId;
  name: string;
  description: string;
  time?: string | null;
  cost?: number | null;
  currency?: string | null;
  images?: string[];
}

export interface BudgetItem {
  _id: Types.ObjectId;
  dayId: Types.ObjectId;
  category: BudgetCategory;
  amount: number;
  currency: string;
}

export interface TransportItem {
  _id: Types.ObjectId;
  dayId: Types.ObjectId;
  mode: TransportMode;
  fromCityId: string;
  toCityId: string;
  amount: number;
  currency: string;
}

export interface PlanItems {
  activities: ActivityItem[];
  budgetEntries: BudgetItem[];
  transportCosts: TransportItem[];
}

export const EMPTY_PLAN: PlanItems = {
  activities: [],
  budgetEntries: [],
  transportCosts: [],
};

// What the API sends for each item (no internal fields such as __v)
export const activityView = (a: ActivityItem) => ({
  _id: a._id,
  dayId: a.dayId,
  name: a.name,
  description: a.description,
  time: a.time ?? null,
  cost: a.cost ?? null,
  currency: a.currency ?? null,
  images: a.images ?? [],
});

export const budgetView = (b: BudgetItem) => ({
  _id: b._id,
  dayId: b.dayId,
  category: b.category,
  amount: b.amount,
  currency: b.currency,
});

export const transportView = (t: TransportItem) => ({
  _id: t._id,
  dayId: t.dayId,
  mode: t.mode,
  fromCityId: t.fromCityId,
  toCityId: t.toCityId,
  amount: t.amount,
  currency: t.currency,
});
