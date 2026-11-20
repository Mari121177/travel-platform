import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser, RequestWithUser } from '../interfaces/auth-user.interface';

// @CurrentUser() user: AuthUser          the whole user
// @CurrentUser('id') userId: string      one field
// Returns undefined on a @Public() route when nobody is logged in.
export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest<RequestWithUser>().user;
    return field ? user?.[field] : user;
  },
);