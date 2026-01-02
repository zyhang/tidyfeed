-- Migration: Add twitter_handle to users table
-- Description: Maps Twitter handles to TidyFeed users for bot integration
-- Date: 2026-01-02

-- Add twitter_handle column (lowercase, no @ symbol)
-- Note: SQLite doesn't allow adding UNIQUE columns directly, so we add without UNIQUE first
ALTER TABLE users ADD COLUMN twitter_handle TEXT;

-- Create unique index (this enforces uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_twitter_handle ON users(twitter_handle);
