import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type Stripe from 'stripe';
import { NotificationType } from '../notifications/notification-type.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  BookingType,
  PaymentStatus,
  RefundReason,
  RefundStatus,
} from './enums/payment.enums';
import {
  FLIGHT_BOOKING_PORT,
  HOTEL_BOOKING_PORT,
} from './interfaces/payable-booking.interface';
import type {
  BookingPaymentPort,
  PayableBooking,
  PaymentsPort,
} from './interfaces/payable-booking.interface';
import {
  formatMoney,
  platformCurrency,
  roundMoney,
  toMinorUnits,
} from './payments.constants';
import type { TestPaymentMethod } from './payments.constants';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { PolicyAcceptance } from './schemas/policy-acceptance.schema';
import { Refund, RefundDocument } from './schemas/refund.schema';
import { StripeService } from './stripe.service';

/** Result of the test-mode confirm endpoint. */
export interface TestPaymentResult {
  paymentId: string;
  stripeStatus: string;
  message: string;
}

const OBJECT_ID = /^[a-f\d]{24}$/i;
const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));
const isDuplicateKey = (err: unknown) =>
  (err as { code?: number })?.code === 11000;

@Injectable()
export class PaymentsService implements PaymentsPort {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<Payment>,
    @InjectModel(Refund.name)
    private readonly refundModel: Model<Refund>,
    @InjectModel(PolicyAcceptance.name)
    private readonly acceptanceModel: Model<PolicyAcceptance>,
    private readonly stripeService: StripeService,
    private readonly notificationsService: NotificationsService,
    private readonly moduleRef: ModuleRef,
  ) {}

  // ---------------------------------------------------------------------------
  // PAY-02: policies
  // ---------------------------------------------------------------------------

  /** The provider policies the user must accept before paying. */
  async getPolicies(userId: string, type: BookingType, bookingId: string) {
    const booking = await this.loadOwnedBooking(userId, type, bookingId);
    return {
      bookingType: type,
      bookingId,
      status: booking.status,
      totalPrice: booking.totalPrice,
      currency: platformCurrency(),
      holdExpiresAt: booking.holdExpiresAt,
      policies: booking.policies ?? {},
      policiesAcceptedAt: booking.policiesAcceptedAt,
    };
  }

  /** Records the acceptance with a timestamp, on the booking and in payments. */
  async acceptPolicies(userId: string, type: BookingType, bookingId: string) {
    const booking = await this.loadOwnedBooking(userId, type, bookingId);

    // The booking module checks owner, status and hold, and saves policiesAcceptedAt.
    await this.bookingPort(type).markPoliciesAccepted(bookingId, userId);

    // Keep a copy of exactly what was accepted, for refunds and disputes.
    const acceptedAt = new Date();
    await this.acceptanceModel
      .updateOne(
        { userId: oid(userId), bookingType: type, bookingId: oid(bookingId) },
        { $set: { policies: booking.policies ?? {}, acceptedAt } },
        { upsert: true },
      )
      .exec();

    return { bookingType: type, bookingId, acceptedAt };
  }

  // ---------------------------------------------------------------------------
  // PAY-01: payments
  // ---------------------------------------------------------------------------

  /** Starts paying for a Pending Payment booking. Returns the Stripe client secret. */
  async createPayment(userId: string, dto: CreatePaymentDto) {
    const { bookingType, bookingId } = dto;
    const booking = await this.loadOwnedBooking(userId, bookingType, bookingId);
    this.assertPayable(booking);

    const acceptance = await this.acceptanceModel
      .findOne({
        userId: oid(userId),
        bookingType,
        bookingId: oid(bookingId),
      })
      .exec();
    if (!acceptance) {
      throw new BadRequestException(
        'Accept the provider policies before paying (PAY-02)',
      );
    }

    const alreadyPaid = await this.paymentModel
      .exists({
        bookingType,
        bookingId: oid(bookingId),
        status: PaymentStatus.SUCCEEDED,
      })
      .exec();
    if (alreadyPaid) {
      throw new ConflictException('This booking is already paid');
    }

    // Clicking "Pay" twice must not create a second charge: reuse the open payment.
    const open = await this.paymentModel
      .findOne({
        bookingType,
        bookingId: oid(bookingId),
        status: { $in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
      })
      .sort({ createdAt: -1 })
      .exec();
    if (open) {
      return this.resumePayment(open, booking);
    }

    const intent = await this.createIntent(
      bookingType,
      bookingId,
      booking.totalPrice,
      userId,
    );
    const payment = await this.paymentModel.create({
      userId: oid(userId),
      bookingType,
      bookingId: oid(bookingId),
      stripePaymentIntentId: intent.id,
      amount: roundMoney(booking.totalPrice),
      currency: platformCurrency(),
      status: PaymentStatus.PENDING,
      policyAcceptanceId: acceptance._id,
    });

    return {
      payment: this.paymentView(payment),
      clientSecret: intent.client_secret,
    };
  }

  /** After a failed attempt, lets the user try again while the hold is valid. */
  async retryPayment(userId: string, paymentId: string) {
    const payment = await this.findOwnedPayment(userId, paymentId);
    if (payment.status === PaymentStatus.SUCCEEDED) {
      throw new ConflictException('This payment already succeeded');
    }
    if (payment.status === PaymentStatus.CANCELLED) {
      throw new ConflictException(
        'The hold expired, so this payment was cancelled. Please book again.',
      );
    }
    const booking = await this.loadOwnedBooking(
      userId,
      payment.bookingType,
      payment.bookingId.toString(),
    );
    this.assertPayable(booking);
    return this.resumePayment(payment, booking);
  }

  async getPayment(userId: string, paymentId: string) {
    const payment = await this.findOwnedPayment(userId, paymentId);
    return this.paymentView(payment);
  }

  /**
   * Test mode only: confirms the PaymentIntent with a Stripe test payment
   * method, so the flow can be demonstrated from Swagger. The booking is still
   * confirmed only by the webhook.
   */
  async confirmTestPayment(
    userId: string,
    paymentId: string,
    paymentMethod: TestPaymentMethod,
  ): Promise<TestPaymentResult> {
    if (!this.stripeService.isTestMode) {
      throw new NotFoundException();
    }
    const payment = await this.findOwnedPayment(userId, paymentId);
    if (
      payment.status !== PaymentStatus.PENDING &&
      payment.status !== PaymentStatus.FAILED
    ) {
      throw new ConflictException(`This payment is ${payment.status}`);
    }

    try {
      const intent = await this.stripe.paymentIntents.confirm(
        payment.stripePaymentIntentId,
        { payment_method: paymentMethod },
      );
      return {
        paymentId,
        stripeStatus: String(intent.status),
        message:
          'Stripe processed the payment. The booking is confirmed when the webhook arrives.',
      };
    } catch (err) {
      // A declined test card is a normal outcome; Stripe also sends payment_intent.payment_failed.
      if ((err as { type?: string }).type === 'StripeCardError') {
        return {
          paymentId,
          stripeStatus: 'requires_payment_method',
          message: (err as Error).message,
        };
      }
      throw this.toHttpError(err);
    }
  }

  // ---------------------------------------------------------------------------
  // PAY-03: refunds
  // ---------------------------------------------------------------------------

  async getRefund(userId: string, refundId: string) {
    const refund = await this.refundModel.findById(refundId).exec();
    if (!refund || refund.userId.toString() !== userId) {
      throw new NotFoundException('Refund not found');
    }
    return this.refundView(refund);
  }

  /** PAY-03: the refund of a booking, for the booking details page. */
  async getRefundForBooking(
    userId: string,
    type: BookingType,
    bookingId: string,
  ) {
    const refund = await this.refundModel
      .findOne({
        userId: oid(userId),
        bookingType: type,
        bookingId: oid(bookingId),
      })
      .exec();
    if (!refund) {
      throw new NotFoundException('No refund for this booking');
    }
    return this.refundView(refund);
  }

  /**
   * PAYMENTS_PORT: called by the booking modules after a Confirmed booking
   * becomes Cancelled with amount > 0 (amount in platform currency units).
   * One refund per booking: repeated calls return the same refund, and a
   * refund that failed at Stripe is retried.
   */
  async refund(
    type: string,
    bookingId: string,
    amount: number,
    reason: string,
  ): Promise<{ id: string }> {
    const bookingType = this.toBookingType(type);
    const refundReason = this.toRefundReason(reason);
    if (!OBJECT_ID.test(bookingId)) {
      throw new BadRequestException('bookingId must be a valid id');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Refund amount must be greater than 0');
    }

    let refund = await this.refundModel
      .findOne({ bookingType, bookingId: oid(bookingId) })
      .exec();
    if (refund && refund.status !== RefundStatus.FAILED) {
      return { id: refund._id.toString() };
    }

    if (!refund) {
      const payment = await this.paymentModel
        .findOne({
          bookingType,
          bookingId: oid(bookingId),
          status: PaymentStatus.SUCCEEDED,
        })
        .exec();
      if (!payment) {
        throw new NotFoundException(
          'No successful payment found for this booking',
        );
      }
      try {
        refund = await this.refundModel.create({
          userId: payment.userId,
          paymentId: payment._id,
          bookingType,
          bookingId: oid(bookingId),
          amount: Math.min(
            roundMoney(amount, payment.currency),
            payment.amount,
          ),
          currency: payment.currency,
          status: RefundStatus.PENDING,
          reason: refundReason,
        });
      } catch (err) {
        // Two calls at the same time: the other one already created it.
        if (isDuplicateKey(err)) {
          const existing = await this.refundModel
            .findOne({ bookingType, bookingId: oid(bookingId) })
            .exec();
          if (existing) {
            return { id: existing._id.toString() };
          }
        }
        throw err;
      }
    }

    await this.sendRefundToStripe(refund);
    return { id: refund._id.toString() };
  }

  /**
   * PAYMENTS_PORT: called when a booking's 10-minute hold expires.
   * Cancels the open Stripe PaymentIntent (PAY-01).
   */
  async cancelForExpiredHold(type: string, bookingId: string) {
    const bookingType = this.toBookingType(type);
    if (!OBJECT_ID.test(bookingId)) {
      return { cancelled: 0 };
    }
    const open = await this.paymentModel
      .find({
        bookingType,
        bookingId: oid(bookingId),
        status: { $in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
      })
      .exec();

    let cancelled = 0;
    for (const payment of open) {
      if (await this.cancelIntent(payment.stripePaymentIntentId)) {
        payment.status = PaymentStatus.CANCELLED;
        await payment.save();
        cancelled++;
      }
    }
    return { cancelled };
  }

  // ---------------------------------------------------------------------------
  // PAY-01: Stripe webhook
  // ---------------------------------------------------------------------------

  async handleWebhook(rawBody: Buffer | undefined, signature?: string) {
    if (!rawBody) {
      throw new BadRequestException(
        'Missing request body: Stripe must send the event JSON (and rawBody must be enabled in main.ts)',
      );
    }
    if (!signature) {
      throw new BadRequestException('Missing Stripe-Signature header');
    }
    const secret = this.stripeService.webhookSecret;
    if (!secret) {
      throw new ServiceUnavailableException(
        'Payments are not configured: STRIPE_WEBHOOK_SECRET is missing',
      );
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${(err as Error).message}`,
      );
    }

    const object = event.data.object as unknown;
    switch (event.type as string) {
      case 'payment_intent.succeeded':
        await this.onPaymentSucceeded(object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.onPaymentClosed(
          object as Stripe.PaymentIntent,
          PaymentStatus.FAILED,
        );
        break;
      case 'payment_intent.canceled':
        await this.onPaymentClosed(
          object as Stripe.PaymentIntent,
          PaymentStatus.CANCELLED,
        );
        break;
      case 'refund.updated':
      case 'refund.failed':
        await this.onRefundUpdated(object as Stripe.Refund);
        break;
      default:
        break;
    }
    return { received: true };
  }

  private async onPaymentSucceeded(intent: Stripe.PaymentIntent) {
    const payment = await this.paymentModel
      .findOne({ stripePaymentIntentId: intent.id })
      .exec();
    if (!payment) {
      this.logger.warn(`Ignoring success for unknown PaymentIntent ${intent.id}`);
      return;
    }
    if (payment.status !== PaymentStatus.SUCCEEDED) {
      payment.status = PaymentStatus.SUCCEEDED;
      await payment.save();
    }

    const bookingId = payment.bookingId.toString();
    try {
      // Safe on a repeated webhook: the booking module returns normally if already Confirmed.
      await this.bookingPort(payment.bookingType).confirmBooking(
        bookingId,
        payment._id.toString(),
      );
    } catch (err) {
      if (err instanceof HttpException && err.getStatus() === 409) {
        // Paid after the hold expired: the booking can't be confirmed, so refund in full.
        this.logger.warn(
          `Booking ${bookingId} could not be confirmed after payment; refunding in full`,
        );
        await this.refund(
          payment.bookingType,
          bookingId,
          payment.amount,
          RefundReason.LATE_PAYMENT,
        );
        return;
      }
      throw err; // Stripe retries the webhook
    }
  }

  private async onPaymentClosed(
    intent: Stripe.PaymentIntent,
    status: PaymentStatus.FAILED | PaymentStatus.CANCELLED,
  ) {
    const payment = await this.paymentModel
      .findOne({ stripePaymentIntentId: intent.id })
      .exec();
    if (!payment || payment.status === PaymentStatus.SUCCEEDED) {
      return;
    }
    // A failed payment does not change the booking: it stays Pending Payment (GEN-11).
    payment.status = status;
    await payment.save();
  }

  private async onRefundUpdated(stripeRefund: Stripe.Refund) {
    const refund = await this.refundModel
      .findOne({ stripeRefundId: stripeRefund.id })
      .exec();
    if (!refund) {
      return;
    }
    const status = this.mapRefundStatus(stripeRefund.status);
    if (status === refund.status) {
      return;
    }
    refund.status = status;
    await refund.save();
    await this.notifyRefund(refund);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private get stripe(): Stripe {
    return this.stripeService.api;
  }

  /** Finds the flight or hotel booking service by token (no module import). */
  private bookingPort(type: BookingType): BookingPaymentPort {
    const token =
      type === BookingType.HOTEL ? HOTEL_BOOKING_PORT : FLIGHT_BOOKING_PORT;
    try {
      return this.moduleRef.get<BookingPaymentPort>(token, { strict: false });
    } catch {
      throw new ServiceUnavailableException(
        `${type === BookingType.HOTEL ? 'Hotel' : 'Flight'} bookings are not available yet`,
      );
    }
  }

  /** Loads the booking and makes sure it belongs to the logged-in user. */
  private async loadOwnedBooking(
    userId: string,
    type: BookingType,
    bookingId: string,
  ): Promise<PayableBooking> {
    const booking = await this.bookingPort(type).getPayableBooking(bookingId);
    // 404 (not 403) so users can't tell whether someone else's booking exists.
    if (!booking || String(booking.userId) !== userId) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  /** PAY-01 / PAY-02 / ACC-15 checks before any charge. */
  private assertPayable(booking: PayableBooking) {
    if (booking.status !== 'PendingPayment') {
      throw new ConflictException(
        `This booking is ${booking.status}, so it cannot be paid`,
      );
    }
    const expires = booking.holdExpiresAt
      ? new Date(booking.holdExpiresAt)
      : null;
    if (!expires || expires.getTime() <= Date.now()) {
      throw new ConflictException(
        'The 10-minute hold on this booking has expired',
      );
    }
    if (booking.hotelActive === false || booking.airlineActive === false) {
      throw new ConflictException(
        'This provider is deactivated, so the booking cannot be paid',
      );
    }
    if (!booking.policiesAcceptedAt) {
      throw new BadRequestException(
        'Accept the provider policies before paying (PAY-02)',
      );
    }
  }

  private createIntent(
    type: BookingType,
    bookingId: string,
    totalPrice: number,
    userId: string,
  ) {
    const currency = platformCurrency();
    const amount = toMinorUnits(totalPrice, currency);
    if (!(amount > 0)) {
      throw new BadRequestException('The booking total must be greater than 0');
    }
    return this.stripeCall(() =>
      this.stripe.paymentIntents.create({
        amount,
        currency: currency.toLowerCase(),
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        metadata: { bookingType: type, bookingId, userId },
      }),
    );
  }

  /** Returns the client secret of an open payment, replacing a cancelled PaymentIntent. */
  private async resumePayment(payment: PaymentDocument, booking: PayableBooking) {
    let intent = await this.stripeCall(() =>
      this.stripe.paymentIntents.retrieve(payment.stripePaymentIntentId),
    );
    if (intent.status === 'succeeded') {
      throw new ConflictException(
        'This payment already succeeded; the booking is being confirmed',
      );
    }
    if (intent.status === 'canceled') {
      intent = await this.createIntent(
        payment.bookingType,
        payment.bookingId.toString(),
        booking.totalPrice,
        payment.userId.toString(),
      );
      payment.stripePaymentIntentId = intent.id;
    }
    payment.status = PaymentStatus.PENDING;
    await payment.save();
    return {
      payment: this.paymentView(payment),
      clientSecret: intent.client_secret,
    };
  }

  /** Returns true if the PaymentIntent is cancelled (now or already). */
  private async cancelIntent(intentId: string): Promise<boolean> {
    try {
      await this.stripe.paymentIntents.cancel(intentId);
      return true;
    } catch {
      try {
        const intent = await this.stripe.paymentIntents.retrieve(intentId);
        return intent.status === 'canceled';
      } catch (err) {
        this.logger.error(
          `Could not cancel PaymentIntent ${intentId}: ${(err as Error).message}`,
        );
        return false;
      }
    }
  }

  private async sendRefundToStripe(refund: RefundDocument) {
    try {
      const payment = await this.paymentModel.findById(refund.paymentId).exec();
      if (!payment) {
        throw new Error('payment not found');
      }
      const stripeRefund = await this.stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: toMinorUnits(refund.amount, refund.currency),
        metadata: {
          refundId: refund._id.toString(),
          bookingType: refund.bookingType,
          bookingId: refund.bookingId.toString(),
        },
      });
      refund.stripeRefundId = stripeRefund.id;
      refund.status = this.mapRefundStatus(stripeRefund.status);
    } catch (err) {
      // Saved as Failed so it can be retried; the cancellation itself stays valid.
      this.logger.error(
        `Stripe refund failed for booking ${refund.bookingId.toString()}: ${(err as Error).message}`,
      );
      refund.status = RefundStatus.FAILED;
    }
    await refund.save();
    await this.notifyRefund(refund);
  }

  /** PAY-03: the user receives an in-app notification. */
  private async notifyRefund(refund: RefundDocument) {
    const amount = formatMoney(refund.amount, refund.currency);
    const data = {
      refundId: refund._id.toString(),
      bookingType: refund.bookingType,
      bookingId: refund.bookingId.toString(),
    };
    if (refund.status === RefundStatus.FAILED) {
      await this.notificationsService.send(
        refund.userId,
        NotificationType.REFUND_FAILED,
        `Your refund of ${amount} could not be processed yet.`,
        data,
      );
      return;
    }
    const message =
      refund.status === RefundStatus.REFUNDED
        ? `Your refund of ${amount} has been issued.`
        : `Your refund of ${amount} is being processed.`;
    await this.notificationsService.send(
      refund.userId,
      NotificationType.REFUND_ISSUED,
      message,
      data,
    );
  }

  /** Stripe refund status -> PAY-03 status. */
  private mapRefundStatus(status: string | null | undefined): RefundStatus {
    if (status === 'succeeded') {
      return RefundStatus.REFUNDED;
    }
    if (status === 'failed' || status === 'canceled') {
      return RefundStatus.FAILED;
    }
    return RefundStatus.PENDING;
  }

  private async findOwnedPayment(userId: string, paymentId: string) {
    const payment = await this.paymentModel.findById(paymentId).exec();
    if (!payment || payment.userId.toString() !== userId) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  private toBookingType(type: string): BookingType {
    if (type === BookingType.HOTEL || type === BookingType.FLIGHT) {
      return type;
    }
    throw new BadRequestException(`Unknown booking type: ${type}`);
  }

  private toRefundReason(reason: string): RefundReason {
    const values: string[] = Object.values(RefundReason);
    if (values.includes(reason)) {
      return reason as RefundReason;
    }
    throw new BadRequestException(`Unknown refund reason: ${reason}`);
  }

  /** Runs a Stripe call and turns Stripe errors into a clear HTTP error. */
  private async stripeCall<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      throw this.toHttpError(err);
    }
  }

  private toHttpError(err: unknown): HttpException {
    if (err instanceof HttpException) {
      return err;
    }
    this.logger.error(`Stripe request failed: ${(err as Error).message}`);
    return new BadGatewayException(
      `Payment provider error: ${(err as Error).message}`,
    );
  }

  private paymentView(payment: PaymentDocument) {
    return {
      id: payment._id.toString(),
      bookingType: payment.bookingType,
      bookingId: payment.bookingId.toString(),
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      stripePaymentIntentId: payment.stripePaymentIntentId,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private refundView(refund: RefundDocument) {
    return {
      id: refund._id.toString(),
      paymentId: refund.paymentId.toString(),
      bookingType: refund.bookingType,
      bookingId: refund.bookingId.toString(),
      amount: refund.amount,
      currency: refund.currency,
      status: refund.status,
      reason: refund.reason,
      stripeRefundId: refund.stripeRefundId ?? null,
      createdAt: refund.createdAt,
      updatedAt: refund.updatedAt,
    };
  }
}
