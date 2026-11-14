import type { ItineraryDay } from './schemas/itinerary-day.schema';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface DayView {
  _id: unknown;
  dayNumber: number;
  date: string;
  cityId: string;
  cityName: string | null;
  notes: string;
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
  // The sum of the group's budget entries. Budget entries arrive with ITN-14,
  // until then every group is 0.
  budgetSubtotal: number;
}

/** The date of day number (index + 1): the start date plus index days (UTC). */
export function dayDate(startDate: Date, index: number): string {
  return new Date(startDate.getTime() + index * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

/**
 * ITN-05: day numbers and dates are derived from the array order and the start
 * date, so they are always right after an add, a delete, a reorder or a change
 * of the start date.
 */
export function buildDayViews(
  startDate: Date,
  days: ItineraryDay[],
  cityNames: Map<string, string>,
): DayView[] {
  return days.map((day, index) => ({
    _id: day._id,
    dayNumber: index + 1,
    date: dayDate(startDate, index),
    cityId: day.cityId,
    cityName: cityNames.get(day.cityId) ?? null,
    notes: day.notes,
  }));
}

/** ITN-09: group consecutive days that are in the same city. */
export function groupDaysByCity(days: DayView[]): CityGroupView[] {
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
        budgetSubtotal: 0,
      });
    }
  }
  return groups;
}
