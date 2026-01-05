
import Stripe from 'stripe';
import { PlanType } from './subscription';

export class StripeService {
    private stripe: Stripe;
    private env: any;

    constructor(env: any) {
        this.env = env;
        this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
            httpClient: Stripe.createFetchHttpClient(),
        });
    }

    /**
     * Create a checkout session for a subscription
     */
    async createCheckoutSession(userId: string, email: string, plan: PlanType, returnUrl: string) {
        let priceId;
        if (plan === 'pro') {
            priceId = this.env.STRIPE_PRICE_ID_PRO;
        } else if (plan === 'ultra') {
            priceId = this.env.STRIPE_PRICE_ID_ULTRA;
        } else {
            throw new Error('Invalid plan for checkout');
        }

        if (!priceId) {
            throw new Error(`Price ID not configured for plan: ${plan}`);
        }

        const session = await this.stripe.checkout.sessions.create({
            customer_email: email,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${returnUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${returnUrl}/cancel`,
            metadata: {
                userId,
                plan,
            },
            subscription_data: {
                metadata: {
                    userId,
                    plan,
                }
            }
        });

        return session;
    }

    /**
     * Verify and construct webhook event
     */
    async constructEvent(body: string, signature: string) {
        return this.stripe.webhooks.constructEvent(
            body,
            signature,
            this.env.STRIPE_WEBHOOK_SECRET
        );
    }
}
