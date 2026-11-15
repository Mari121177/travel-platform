import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ConfirmTestPaymentDto } from './dto/confirm-test-payment.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { IdParamDto } from './dto/id-param.dto';
import { PaymentsService } from './payments.service';

// No class-level @Roles: the webhook must stay public for Stripe.
@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(Role.User)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'PAY-01: start paying for a Pending Payment booking (creates a Stripe PaymentIntent)',
  })
  @ApiCreatedResponse({
    description:
      'Returns { payment, clientSecret }. The frontend uses clientSecret with Stripe Elements.',
  })
  @ApiBadRequestResponse({ description: 'Policies not accepted, or invalid input' })
  @ApiConflictResponse({
    description: 'Booking not Pending Payment, hold expired, provider deactivated, or already paid',
  })
  @ApiNotFoundResponse({ description: 'Booking not found, or not yours' })
  @ApiUnauthorizedResponse({ description: 'Not logged in' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.createPayment(userId, dto);
  }

  @Post('webhook')
  @Public()
  @HttpCode(200)
  @ApiOperation({
    summary:
      'PAY-01: Stripe webhook. Called by Stripe and verified with the Stripe-Signature header; confirms the booking after a successful payment',
  })
  @ApiOkResponse({ description: 'Returns { received: true }' })
  @ApiBadRequestResponse({ description: 'Missing or invalid Stripe signature' })
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    return this.paymentsService.handleWebhook(req.rawBody, signature);
  }

  @Post(':id/retry')
  @Roles(Role.User)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'PAY-01: retry a failed payment while the 10-minute hold is still valid',
  })
  @ApiCreatedResponse({ description: 'Returns { payment, clientSecret }' })
  @ApiConflictResponse({ description: 'Already paid, cancelled, or the hold expired' })
  @ApiNotFoundResponse({ description: 'Payment not found, or not yours' })
  retry(@CurrentUser('id') userId: string, @Param() params: IdParamDto) {
    return this.paymentsService.retryPayment(userId, params.id);
  }

  @Get(':id')
  @Roles(Role.User)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'PAY-01: view my payment and its status' })
  @ApiOkResponse({ description: 'The payment' })
  @ApiNotFoundResponse({ description: 'Payment not found, or not yours' })
  findOne(@CurrentUser('id') userId: string, @Param() params: IdParamDto) {
    return this.paymentsService.getPayment(userId, params.id);
  }

  @Post(':id/confirm-test')
  @Roles(Role.User)
  @ApiCookieAuth()
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Test mode only: pay with a Stripe test card to demo the flow without a frontend (the webhook still confirms the booking)',
  })
  @ApiOkResponse({ description: 'Returns the Stripe status of the payment' })
  @ApiNotFoundResponse({ description: 'Not in test mode, or payment not found' })
  confirmTest(
    @CurrentUser('id') userId: string,
    @Param() params: IdParamDto,
    @Body() dto: ConfirmTestPaymentDto,
  ) {
    return this.paymentsService.confirmTestPayment(
      userId,
      params.id,
      dto.paymentMethod,
    );
  }
}
