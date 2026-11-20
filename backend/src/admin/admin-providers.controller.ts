import { Controller, Param, Patch } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { AdminProvidersService } from './admin-providers.service';
import { ProviderParamsDto } from './dto/provider-params.dto';

// ACC-15: provider deactivation is separate from suspending its moderator.
@ApiTags('Admin')
@ApiCookieAuth()
@Roles(Role.Admin)
@ApiUnauthorizedResponse({ description: 'Not logged in, or the session expired' })
@ApiForbiddenResponse({ description: 'Admins only' })
@Controller('admin/providers')
export class AdminProvidersController {
  constructor(private readonly providersService: AdminProvidersService) {}

  @Patch(':type/:id/deactivate')
  @ApiOperation({
    summary: 'ACC-15: deactivate a hotel or airline',
  })
  @ApiOkResponse({
    description:
      'Returns the provider, its active flag and how many users were notified',
  })
  @ApiNotFoundResponse({ description: 'Hotel or airline not found' })
  deactivate(
    @CurrentUser() admin: AuthUser,
    @Param() params: ProviderParamsDto,
  ) {
    return this.providersService.setActive(
      admin,
      params.type,
      params.id,
      false,
    );
  }

  @Patch(':type/:id/reactivate')
  @ApiOperation({
    summary: 'ACC-15: reactivate a hotel or airline',
  })
  @ApiOkResponse({
    description:
      'Returns the provider, its active flag and how many users were notified',
  })
  @ApiNotFoundResponse({ description: 'Hotel or airline not found' })
  reactivate(
    @CurrentUser() admin: AuthUser,
    @Param() params: ProviderParamsDto,
  ) {
    return this.providersService.setActive(
      admin,
      params.type,
      params.id,
      true,
    );
  }
}
