// Plain strings work everywhere: Role.Admin and 'admin' are the same value.
export const Role = {
  User: 'user',
  Admin: 'admin',
  AirlineModerator: 'airline_moderator',
  HotelModerator: 'hotel_moderator',
} as const;

export type Role = (typeof Role)[keyof typeof Role];