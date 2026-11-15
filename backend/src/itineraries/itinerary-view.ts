import { totalsPerCurrency, type CostItem } from './budget-summary';
import {
  activityView,
  budgetView,
  EMPTY_PLAN,
  transportView,
  type PlanItems,
} from './plan-items';
import type { ItineraryDay } from './schemas/itinerary-day.schema';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface DayView {
  _id: unknown;
  dayNumber: number;
  date: string;
  cityId: string;
  cityName: string | null;
  notes: string;
  // ITN-10, ITN-14, ITN-16: what is planned on this day
  activities: ReturnType<typeof activityView>[];
  budgetEntries: ReturnType<typeof budgetView>[];
  transportCosts: ReturnType<typeof transportView>[];
}

/** ITN-09: consecutive days in the same city, shown as one group. */
export interface CityGroupView {
  cityId: string;
  cityName: string | null;
  startDay: number;
  endDay: number;
  startDate: string;
  endDate: string;
  dayCount: number;
  // The group's planned amounts, one total per currency, for example
  // { "USD": 120, "EUR": 40 }.
  budgetSubtotals: Record<string, number>;
  // ITN-18: the group's subtotal in the viewer's preferred currency
  convertedSubtotal?: number;
}

/** The date of day number (index + 1): the start date plus index days (UTC). */
export function dayDate(startDate: Date, index: number): string {
  return new Date(startDate.getTime() + index * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

// Activities in time order (no time last), then in the order they were added
const byTimeThenId = (
  a: { time?: string | null; _id: { toString(): string } },
  b: { time?: string | null; _id: { toString(): string } },
) =>
  (a.time ?? '99:99').localeCompare(b.time ?? '99:99') ||
  a._id.toString().localeCompare(b._id.toString());

function groupByDay<T extends { dayId: { toString(): string } }>(items: T[]) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = item.dayId.toString();
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return map;
}

/**
 * ITN-05: day numbers and dates are derived from the array order and the start
 * date, so they are always right after an add, a delete, a reorder or a change
 * of the start date. ITN-10, ITN-14, ITN-16: each day also carries what is
 * planned on it.
 */
export function buildDayViews(
  startDate: Date,
  days: ItineraryDay[],
  cityNames: Map<string, string>,
  plan: PlanItems = EMPTY_PLAN,
): DayView[] {
  const activities = groupByDay(plan.activities);
  const budgetEntries = groupByDay(plan.budgetEntries);
  const transportCosts = groupByDay(plan.transportCosts);

  return days.map((day, index) => {
    const key = day._id.toString();
    return {
      _id: day._id,
      dayNumber: index + 1,
      date: dayDate(startDate, index),
      cityId: day.cityId,
      cityName: cityNames.get(day.cityId) ?? null,
      notes: day.notes,
      activities: (activities.get(key) ?? [])
        .sort(byTimeThenId)
        .map(activityView),
      budgetEntries: (budgetEntries.get(key) ?? []).map(budgetView),
      transportCosts: (transportCosts.get(key) ?? []).map(transportView),
    };
  });
}

/**
 * ITN-09: group consecutive days that are in the same city, with the day count
 * and the budget subtotal of each group.
 */
export function groupDaysByCity(
  days: DayView[],
  costItems: CostItem[] = [],
): CityGroupView[] {
  const groups: CityGroupView[] = [];
  for (const day of days) {
    const last = groups[groups.length - 1];
    if (last && last.cityId === day.cityId) {
      last.endDay = day.dayNumber;
      last.endDate = day.date;
      last.dayCount += 1;
    } else {
      groups.push({
        cityId: day.cityId,
        cityName: day.cityName,
        startDay: day.dayNumber,
        endDay: day.dayNumber,
        startDate: day.date,
        endDate: day.date,
        dayCount: 1,
        budgetSubtotals: {},
      });
    }
  }

  const dayNumberById = new Map(
    days.map((day) => [String(day._id), day.dayNumber]),
  );
  for (const group of groups) {
    group.budgetSubtotals = totalsPerCurrency(
      costItems.filter((item) => {
        const dayNumber = dayNumberById.get(item.dayId);
        return (
          dayNumber !== undefined &&
          dayNumber >= group.startDay &&
          dayNumber <= group.endDay
        );
      }),
    );
  }
  return groups;
}
