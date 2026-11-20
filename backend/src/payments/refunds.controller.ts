import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { IdParamDto } from './dto/id-param.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'Not logged in' })
@Roles(Role.User)
@Controller('refunds')
export class RefundsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'PAY-03: view my refund and its status (Pending, Refunded, Failed)',
  })
  @ApiOkResponse({ description: 'The refund' })
  @ApiNotFoundResponse({ description: 'Refund not found, or not yours' })
  findOne(@CurrentUser('id') userId: string, @Param() params: IdParamDto) {
    return this.paymentsService.getRefund(userId, params.id);
  }
}
