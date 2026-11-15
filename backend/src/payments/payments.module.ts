import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingPoliciesController } from './booking-policies.controller';
import { PAYMENTS_PORT } from './interfaces/payable-booking.interface';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { RefundsController } from './refunds.controller';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import {
  PolicyAcceptance,
  PolicyAcceptanceSchema,
} from './schemas/policy-acceptance.schema';
import { Refund, RefundSchema } from './schemas/refund.schema';
import { StripeService } from './stripe.service';

/**
 * @Global() so the booking modules can inject PAYMENTS_PORT without importing
 * this module (agreed contract with Members 4 and 6).
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Refund.name, schema: RefundSchema },
      { name: PolicyAcceptance.name, schema: PolicyAcceptanceSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [PaymentsController, BookingPoliciesController, RefundsController],
  providers: [
    StripeService,
    PaymentsService,
    { provide: PAYMENTS_PORT, useExisting: PaymentsService },
  ],
  exports: [PAYMENTS_PORT],
})
export class PaymentsModule {}
