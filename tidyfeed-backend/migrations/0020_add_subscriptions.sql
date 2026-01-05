-- Migration 0020: Add Subscription System
-- Adds plan tracking and usage records for 3-tier subscription model

-- Add plan field to users table (defaults to 'free')
-- Note: SQLite ALTER TABLE can only add columns, not constraints on new column
-- The constraint is enforced by application logic
ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN plan_expires_at DATETIME;

-- Usage tracking table for monthly quotas
-- Tracks per-feature usage within a billing period (month)
CREATE TABLE IF NOT EXISTS usage_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    feature TEXT NOT NULL,  -- 'collection', 'ai_summary', 'storage'
    period TEXT NOT NULL,   -- 'YYYY-MM' format for monthly tracking
    count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, feature, period)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_usage_records_lookup ON usage_records(user_id, feature, period);

-- Index on users for plan-based queries
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
