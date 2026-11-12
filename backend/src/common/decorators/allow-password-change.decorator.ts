import { SetMetadata } from '@nestjs/common';

export const ALLOW_PASSWORD_CHANGE_KEY = 'allowPasswordChange';

// An account with a temporary password (ACC-07a, ACC-13) may only call routes
// marked with this decorator until it sets a new password. Only auth routes
// need it. Do not use it on feature routes.
export const AllowPasswordChange = () =>
  SetMetadata(ALLOW_PASSWORD_CHANGE_KEY, true);