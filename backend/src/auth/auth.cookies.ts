import type { Response } from 'express';
import {
  ACCESS_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_COOKIE,
  REFRESH_TOKEN_TTL_SECONDS,
} from './auth.constants';

// The refresh cookie is only sent to /api/auth/* endpoints
const REFRESH_PATH = '/api/auth';

// ACC-19: httpOnly + Secure + SameSite cookies, never readable by JavaScript.
// Secure is on by default. Set COOKIE_SECURE=false in backend/.env only if your
// browser refuses Secure cookies on http://localhost.
// This is read when a cookie is set, not when the file is loaded, because
// ConfigModule loads .env after this file has been imported.
const baseOptions = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE !== 'false',
  sameSite: 'lax' as const,
});

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseOptions(),
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseOptions(),
    path: REFRESH_PATH,
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...baseOptions(), path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions(), path: REFRESH_PATH });
}