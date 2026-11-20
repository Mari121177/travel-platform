import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ItineraryPdfService } from './itinerary-pdf.service';

@ApiTags('Itineraries')
@ApiCookieAuth('access_token')
@Roles(Role.User)
@Controller('itineraries')
export class ItineraryPdfController {
  constructor(private readonly service: ItineraryPdfService) {}

  @Get(':id/export')
  @ApiOperation({ summary: 'ITN-28: export my itinerary as a PDF' })
  async export(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    await this.service.stream(user, id, res);
  }
}
