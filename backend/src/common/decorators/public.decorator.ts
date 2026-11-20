import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Every route requires login by default. @Public() opens a route or a whole
// controller to guests. If a valid session exists, @CurrentUser() still returns
// the user on a public route (undefined for guests).
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);