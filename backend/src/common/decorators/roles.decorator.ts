import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

// Restricts a route or controller to the listed roles, for example
// @Roles(Role.Admin, Role.HotelModerator). Without @Roles(), any logged-in user
// may call the route.
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);