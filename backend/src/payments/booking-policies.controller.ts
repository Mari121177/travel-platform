import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
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
import { AcceptPoliciesDto } from './dto/accept-policies.dto';
import { BookingParamsDto } from './dto/booking-params.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'Not logged in' })
@Roles(Role.User)
@Controller('bookings')
export class BookingPoliciesController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':type/:id/policies')
  @ApiOperation({
    summary:
      'PAY-02: the provider policies to accept before paying (airline: cancellation + baggage; hotel: cancellation + check-in/out times)',
  })
  @ApiOkResponse({
    description:
      'Returns { bookingType, bookingId, status, totalPrice, currency, holdExpiresAt, policies, policiesAcceptedAt }',
  })
  @ApiNotFoundResponse({ description: 'Booking not found, or not yours' })
  getPolicies(
    @CurrentUser('id') userId: string,
    @Param() params: BookingParamsDto,
  ) {
    return this.paymentsService.getPolicies(userId, params.type, params.id);
  }

  @Post(':type/:id/accept-policies')
  @HttpCode(200)
  @ApiOperation({
    summary: 'PAY-02: accept the provider policies (stored with a timestamp)',
  })
  @ApiOkResponse({ description: 'Returns { bookingType, bookingId, acceptedAt }' })
  @ApiNotFoundResponse({ description: 'Booking not found, or not yours' })
  @ApiConflictResponse({ description: 'Booking not Pending Payment, or the hold expired' })
  acceptPolicies(
    @CurrentUser('id') userId: string,
    @Param() params: BookingParamsDto,
    // Validated: "accepted" must be true (the checkbox).
    @Body() body: AcceptPoliciesDto,
  ) {
    return body.accepted
      ? this.paymentsService.acceptPolicies(userId, params.type, params.id)
      : undefined;
  }

  @Get(':type/:id/refund')
  @ApiOperation({
    summary:
      'PAY-03: the refund of my cancelled booking and its status (Pending, Refunded, Failed)',
  })
  @ApiOkResponse({ description: 'The refund' })
  @ApiNotFoundResponse({
    description: 'No refund for this booking, or not yours',
  })
  getRefund(
    @CurrentUser('id') userId: string,
    @Param() params: BookingParamsDto,
  ) {
    return this.paymentsService.getRefundForBooking(
      userId,
      params.type,
      params.id,
    );
  }
}
