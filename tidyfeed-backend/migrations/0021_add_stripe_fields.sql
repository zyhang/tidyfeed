-- Migration 0021: Add Stripe Customer Fields
-- Adds columns to link users to Stripe customers and subscriptions

ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE users ADD COLUMN stripe_price_id TEXT;

-- Index for efficient lookups by stripe customer id (fast webhook processing)
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
