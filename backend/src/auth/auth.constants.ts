export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// ACC-05
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

// ACC-06 (enforced in the auth guard in Step 5)
export const INACTIVITY_LIMIT_MINUTES = 30;