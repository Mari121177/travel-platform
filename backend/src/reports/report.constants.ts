// GEN-09/GEN-10: what a user can report and how an admin resolves it.
export const ReportTargetType = {
  Post: 'post',
  Comment: 'comment',
  Review: 'review',
  Itinerary: 'itinerary',
} as const;
export type ReportTargetType =
  (typeof ReportTargetType)[keyof typeof ReportTargetType];

export const ReportStatus = {
  Open: 'open',
  Resolved: 'resolved',
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export const ReportResolution = {
  Dismissed: 'dismissed',
  Hidden: 'hidden',
  Deleted: 'deleted',
} as const;
export type ReportResolution =
  (typeof ReportResolution)[keyof typeof ReportResolution];

export const PAGE_SIZE = 10; // GEN-05
