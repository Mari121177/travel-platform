import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

/**
 * TEMPORARY until auth is merged: reads the user id from the `x-user-id` header
 * so ownership logic can be tested in Swagger.
 * Later: replace `@TempUserId() userId: string` with `@CurrentUser() user` and use `user.id`.
 */
export const TempUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, unknown> }>();
    const id = req.headers['x-user-id'];
    if (typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id)) {
      throw new BadRequestException(
        'Send a valid Mongo ObjectId in the x-user-id header (temporary until auth is merged)',
      );
    }
    return id;
  },
);
