
import { Hono } from 'hono';
import { StripeService } from '../services/stripe';
import { checkQuota, getUserPlan } from '../services/subscription';
import Stripe from 'stripe';

type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    STRIPE_PRICE_ID_PRO: string;
    STRIPE_PRICE_ID_ULTRA: string;
    WEB_APP_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware removed locally - we instantiate StripeService in handlers

/**
 * POST /api/stripe/checkout
 * Create a checkout session
 */
app.post('/checkout', async (c) => {
    // 1. Auth Check
    const payload = c.get('jwtPayload') as { sub: string; email: string } | undefined;
    if (!payload) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const { plan, returnUrl } = await c.req.json();
    if (plan !== 'pro' && plan !== 'ultra') {
        return c.json({ error: 'Invalid plan' }, 400);
    }

    // Default return URL if not provided
    const safeReturnUrl = returnUrl || c.env.WEB_APP_URL || 'https://tidyfeed.app';

    try {
        const stripeService = new StripeService(c.env);
        const session = await stripeService.createCheckoutSession(
            payload.sub,
            payload.email,
            plan,
            safeReturnUrl
        );

        return c.json({ url: session.url });
    } catch (error: any) {
        console.error('Stripe checkout error:', error);
        return c.json({ error: error.message }, 500);
    }
});

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhooks
 */
app.post('/webhook', async (c) => {
    const signature = c.req.header('stripe-signature');
    const body = await c.req.text();

    if (!signature) {
        return c.text('Missing signature', 400);
    }

    const stripeService = new StripeService(c.env);
    let event: Stripe.Event;

    try {
        event = await stripeService.constructEvent(body, signature);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return c.text(`Webhook Error: ${err.message}`, 400);
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.mode === 'subscription') {
                    await handleSubscriptionCheckoutCompleted(c.env.DB, session);
                }
                break;
            }
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionUpdated(c.env.DB, subscription);
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionDeleted(c.env.DB, subscription);
                break;
            }
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
        return c.text('Error processing webhook', 500);
    }

    return c.json({ received: true });
});

// Helper functions for Webhook handling

async function handleSubscriptionCheckoutCompleted(db: D1Database, session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (!userId || !plan) {
        console.error('Missing metadata in session:', session.id);
        return;
    }

    console.log(`Updating user ${userId} to plan ${plan} (Customer: ${customerId})`);

    await db.prepare(`
        UPDATE users 
        SET plan = ?, 
            stripe_customer_id = ?, 
            stripe_subscription_id = ?, 
            plan_expires_at = datetime('now', '+1 month') -- Approximate, webhook update will fix
        WHERE id = ?
    `).bind(plan, customerId, subscriptionId, userId).run();
}

async function handleSubscriptionUpdated(db: D1Database, subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    const status = subscription.status;
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

    // We assume 1 subscription per user for now, or lookup by customer_id
    // If status is active, we ensure plan is set correctly.
    // If we have price->plan mapping availability, we could update plan type too.
    // For now, we trust the checkout flow set the plan, and we just update expiry/status using customer_id.

    if (status === 'active') {
        await db.prepare(`
            UPDATE users 
            SET plan_expires_at = ?
            WHERE stripe_customer_id = ?
        `).bind(currentPeriodEnd, customerId).run();
    } else if (status === 'past_due' || status === 'canceled' || status === 'unpaid') {
        // Downgrade to free? Or just let expiry handle it?
        // If canceled, it might still be active until period end.
        // Stripe status 'canceled' usually means at end of period.
        // 'unpaid' might mean immediate revocation.

        // Let's just update expiry. The getUserPlan logic checks expiry.
        // If status is explicitly not active/trialing, we might want to be more aggressive?
        // For now, trusting expiry date is safest.
        await db.prepare(`
            UPDATE users 
            SET plan_expires_at = ?
            WHERE stripe_customer_id = ?
        `).bind(currentPeriodEnd, customerId).run();
    }
}

async function handleSubscriptionDeleted(db: D1Database, subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString(); // Typically now

    // Downgrade to free immediately or at end of period?
    // Deleted usually means NOW.

    await db.prepare(`
        UPDATE users 
        SET plan = 'free', plan_expires_at = NULL, stripe_subscription_id = NULL
        WHERE stripe_customer_id = ?
      `).bind(customerId).run();
}

export default app;
