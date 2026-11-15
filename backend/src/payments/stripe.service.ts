import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

/**
 * Wraps the Stripe client (test mode).
 * The client is created on first use, so the backend still starts for
 * teammates who have no Stripe keys in their .env.
 */
@Injectable()
export class StripeService {
  private client: Stripe | null = null;

  constructor(private readonly config: ConfigService) {}

  get api(): Stripe {
    if (!this.client) {
      const key = this.config.get<string>('STRIPE_SECRET_KEY');
      if (!key) {
        throw new ServiceUnavailableException(
          'Payments are not configured: STRIPE_SECRET_KEY is missing',
        );
      }
      this.client = new Stripe(key);
    }
    return this.client;
  }

  get webhookSecret(): string | undefined {
    return this.config.get<string>('STRIPE_WEBHOOK_SECRET');
  }

  /** True only with a test key (sk_test_...). */
  get isTestMode(): boolean {
    const key = this.config.get<string>('STRIPE_SECRET_KEY') ?? '';
    return key.startsWith('sk_test_');
  }
}
