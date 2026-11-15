// ITN-05: an itinerary has at most 60 days
export const MAX_ITINERARY_DAYS = 60;

// Day notes are free text, kept to a reasonable size
export const DAY_NOTES_MAX_LENGTH = 2000;

/** GEN-05: every list is paginated with page size 10. */
export const ITINERARIES_PAGE_SIZE = 10;

// ITN-10: activity limits
export const ACTIVITY_NAME_MAX_LENGTH = 100;
export const ACTIVITY_DESCRIPTION_MAX_LENGTH = 2000;
// "HH:mm", 24-hour
export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// ITN-10, ITN-14, ITN-16: money amounts are non-negative, with 2 decimals at most
export const MAX_AMOUNT = 1_000_000_000;
export const CURRENCY_CODE_LENGTH = 3;

// ITN-14: the categories of a budget entry
export const BudgetCategory = {
  Food: 'food',
  Accommodation: 'accommodation',
  LocalTransport: 'local_transport',
  Activities: 'activities',
} as const;
export type BudgetCategory =
  (typeof BudgetCategory)[keyof typeof BudgetCategory];

// ITN-16: how the user travels between two cities
export const TransportMode = {
  Flight: 'flight',
  Train: 'train',
  Bus: 'bus',
  Car: 'car',
  Ferry: 'ferry',
  Other: 'other',
} as const;
export type TransportMode = (typeof TransportMode)[keyof typeof TransportMode];
