import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { TEST_PAYMENT_METHODS } from '../payments.constants';
import type { TestPaymentMethod } from '../payments.constants';

/** Test mode only: which Stripe test payment method to confirm with. */
export class ConfirmTestPaymentDto {
  @ApiProperty({
    enum: [...TEST_PAYMENT_METHODS],
    example: 'pm_card_visa',
    description: 'pm_card_visa succeeds, pm_card_chargeDeclined is declined',
  })
  @IsIn([...TEST_PAYMENT_METHODS])
  paymentMethod!: TestPaymentMethod;
}
