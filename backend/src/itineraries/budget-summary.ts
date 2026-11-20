import { BudgetCategory } from './itinerary.constants';
import type { PlanItems } from './plan-items';

/**
 * ITN-14: every planned amount of an itinerary as one flat list.
 * - budget entries keep their own category
 * - activity costs count under "activities"
 * - transport costs (ITN-16) count under "intercity_transport"
 */
export type CostCategory = BudgetCategory | 'intercity_transport';

export const COST_CATEGORIES: CostCategory[] = [
  ...Object.values(BudgetCategory),
  'intercity_transport',
];

export interface CostItem {
  dayId: string;
  category: CostCategory;
  amount: number;
  currency: string;
}

export type CategoryTotals = Record<CostCategory, number>;

export interface CurrencyTotals {
  total: number;
  byCategory: CategoryTotals;
}

export function toCostItems(plan: PlanItems): CostItem[] {
  const items: CostItem[] = [];

  for (const entry of plan.budgetEntries) {
    items.push({
      dayId: String(entry.dayId),
      category: entry.category,
      amount: entry.amount,
      currency: entry.currency,
    });
  }
  for (const activity of plan.activities) {
    if (activity.cost != null && activity.currency) {
      items.push({
        dayId: String(activity.dayId),
        category: BudgetCategory.Activities,
        amount: activity.cost,
        currency: activity.currency,
      });
    }
  }
  for (const transport of plan.transportCosts) {
    items.push({
      dayId: String(transport.dayId),
      category: 'intercity_transport',
      amount: transport.amount,
      currency: transport.currency,
    });
  }
  return items;
}

const toCents = (amount: number) => Math.round(amount * 100);
const fromCents = (cents: number) => cents / 100;

/**
 * Totals per currency, and per category inside each currency. Different
 * currencies are NEVER added together here: converting them is ITN-18.
 * Amounts are added in cents, so 0.1 + 0.2 is exactly 0.3.
 */
export function sumByCurrency(
  items: CostItem[],
): Record<string, CurrencyTotals> {
  const cents: Record<string, Record<CostCategory, number>> = {};

  for (const item of items) {
    if (!cents[item.currency]) {
      cents[item.currency] = Object.fromEntries(
        COST_CATEGORIES.map((category) => [category, 0]),
      ) as Record<CostCategory, number>;
    }
    cents[item.currency][item.category] += toCents(item.amount);
  }

  const result: Record<string, CurrencyTotals> = {};
  for (const [currency, byCategory] of Object.entries(cents)) {
    const total = COST_CATEGORIES.reduce(
      (sum, category) => sum + byCategory[category],
      0,
    );
    result[currency] = {
      total: fromCents(total),
      byCategory: Object.fromEntries(
        COST_CATEGORIES.map((category) => [
          category,
          fromCents(byCategory[category]),
        ]),
      ) as CategoryTotals,
    };
  }
  return result;
}

/** Only the total of each currency (used for the city group subtotals). */
export function totalsPerCurrency(items: CostItem[]): Record<string, number> {
  return Object.fromEntries(
    Object.entries(sumByCurrency(items)).map(([currency, totals]) => [
      currency,
      totals.total,
    ]),
  );
}

function emptyTotals(): CurrencyTotals {
  return {
    total: 0,
    byCategory: Object.fromEntries(
      COST_CATEGORIES.map((category) => [category, 0]),
    ) as CategoryTotals,
  };
}

/** ITN-18: the total and per-category totals of items already in one currency. */
export function totalsFor(items: CostItem[], currency: string): CurrencyTotals {
  return sumByCurrency(items)[currency] ?? emptyTotals();
}
