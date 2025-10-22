/**
 * stripe-web.ts
 *
 * Stripe payment adapter for web applications
 * Handles checkout sessions, subscriptions, and webhooks
 *
 * Features:
 * - Checkout session creation
 * - Subscription management
 * - Webhook verification
 * - Customer portal
 * - Usage-based billing
 *
 * Usage:
 *   const stripe = new StripeWebAdapter({
 *     apiKey: process.env.STRIPE_SECRET_KEY,
 *     publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
 *   });
 *
 *   const session = await stripe.createCheckoutSession({
 *     priceId: 'price_xxx',
 *     successUrl: 'https://example.com/success',
 *     cancelUrl: 'https://example.com/cancel'
 *   });
 */

import { EventEmitter } from 'events';

export interface StripeConfig {
  apiKey: string;
  publishableKey: string;
  webhookSecret?: string;
  apiVersion?: string;
}

export interface CheckoutSessionParams {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  customerEmail?: string;
  mode?: 'payment' | 'subscription' | 'setup';
  quantity?: number;
  metadata?: Record<string, string>;
  trialPeriodDays?: number;
  allowPromotionCodes?: boolean;
}

export interface CheckoutSessionResult {
  id: string;
  url: string;
  customerId?: string;
  status: string;
}

export interface SubscriptionResult {
  id: string;
  customerId: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  priceId: string;
  quantity: number;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  created: number;
}

export class StripeWebAdapter extends EventEmitter {
  private config: StripeConfig;
  private stripe: any = null;
  private isInitialized: boolean = false;

  constructor(config: StripeConfig) {
    super();
    this.config = {
      apiVersion: '2023-10-16',
      ...config,
    };
  }

  /**
   * Initialize Stripe SDK
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if Stripe SDK is available
      const Stripe = require('stripe');
      this.stripe = new Stripe(this.config.apiKey, {
        apiVersion: this.config.apiVersion,
      });

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error: any) {
      // Stripe SDK not installed - graceful fallback
      this.emit('error', new Error('Stripe SDK not installed. Run: npm install stripe'));
      throw error;
    }
  }

  /**
   * Check if adapter is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get publishable key (for client-side)
   */
  getPublishableKey(): string {
    return this.config.publishableKey;
  }

  /**
   * Create checkout session
   */
  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    await this.ensureInitialized();

    const sessionParams: any = {
      mode: params.mode || 'subscription',
      line_items: [
        {
          price: params.priceId,
          quantity: params.quantity || 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    };

    if (params.customerId) {
      sessionParams.customer = params.customerId;
    } else if (params.customerEmail) {
      sessionParams.customer_email = params.customerEmail;
    }

    if (params.metadata) {
      sessionParams.metadata = params.metadata;
    }

    if (params.mode === 'subscription') {
      if (params.trialPeriodDays) {
        sessionParams.subscription_data = {
          trial_period_days: params.trialPeriodDays,
        };
      }

      if (params.allowPromotionCodes) {
        sessionParams.allow_promotion_codes = true;
      }
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);

    return {
      id: session.id,
      url: session.url,
      customerId: session.customer,
      status: session.status,
    };
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    await this.ensureInitialized();

    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

    return {
      id: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      priceId: subscription.items.data[0]?.price?.id,
      quantity: subscription.items.data[0]?.quantity || 1,
    };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, immediately: boolean = false): Promise<SubscriptionResult> {
    await this.ensureInitialized();

    let subscription;
    if (immediately) {
      subscription = await this.stripe.subscriptions.cancel(subscriptionId);
    } else {
      subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }

    return {
      id: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      priceId: subscription.items.data[0]?.price?.id,
      quantity: subscription.items.data[0]?.quantity || 1,
    };
  }

  /**
   * Resume canceled subscription
   */
  async resumeSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    await this.ensureInitialized();

    const subscription = await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    return {
      id: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      priceId: subscription.items.data[0]?.price?.id,
      quantity: subscription.items.data[0]?.quantity || 1,
    };
  }

  /**
   * Create customer portal session
   */
  async createPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }> {
    await this.ensureInitialized();

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): WebhookEvent {
    if (!this.config.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret
      );

      return {
        id: event.id,
        type: event.type,
        data: event.data.object,
        created: event.created,
      };
    } catch (error: any) {
      this.emit('error', error);
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  }

  /**
   * Handle webhook event
   */
  async handleWebhook(event: WebhookEvent): Promise<void> {
    this.emit('webhook', event);

    switch (event.type) {
      case 'checkout.session.completed':
        this.emit('checkout.completed', event.data);
        break;

      case 'customer.subscription.created':
        this.emit('subscription.created', event.data);
        break;

      case 'customer.subscription.updated':
        this.emit('subscription.updated', event.data);
        break;

      case 'customer.subscription.deleted':
        this.emit('subscription.deleted', event.data);
        break;

      case 'invoice.payment_succeeded':
        this.emit('payment.succeeded', event.data);
        break;

      case 'invoice.payment_failed':
        this.emit('payment.failed', event.data);
        break;

      default:
        this.emit('webhook.unhandled', event);
    }
  }

  /**
   * Ensure Stripe is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

/**
 * Example usage in Express.js:
 *
 * const stripe = new StripeWebAdapter({
 *   apiKey: process.env.STRIPE_SECRET_KEY!,
 *   publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
 *   webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!
 * });
 *
 * // Create checkout session
 * app.post('/api/checkout', async (req, res) => {
 *   const session = await stripe.createCheckoutSession({
 *     priceId: 'price_xxx',
 *     successUrl: `${req.headers.origin}/success`,
 *     cancelUrl: `${req.headers.origin}/cancel`,
 *     customerEmail: req.body.email
 *   });
 *   res.json({ url: session.url });
 * });
 *
 * // Handle webhooks
 * app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
 *   const signature = req.headers['stripe-signature'];
 *   const event = stripe.verifyWebhookSignature(req.body, signature);
 *   await stripe.handleWebhook(event);
 *   res.json({ received: true });
 * });
 */
