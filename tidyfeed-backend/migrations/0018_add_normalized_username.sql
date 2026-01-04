-- Migration: Add foreign key constraints and normalized username
-- Date: 2026-01-05
-- Description: 
--   1. Add normalized username to social_accounts for case-insensitive lookups
--   2. Note: SQLite doesn't support adding FK constraints after table creation
--      so we document the expected FKs but rely on application-level enforcement

-- Add normalized username column to social_accounts
ALTER TABLE social_accounts ADD COLUMN platform_username_lower TEXT;

-- Backfill existing data
UPDATE social_accounts SET platform_username_lower = LOWER(platform_username) WHERE platform_username IS NOT NULL;

-- Create unique index on normalized username (platform + lowercased username)
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_accounts_platform_username_lower 
ON social_accounts(platform, platform_username_lower);

-- Create index for fast lookups by normalized username
CREATE INDEX IF NOT EXISTS idx_social_accounts_username_lower 
ON social_accounts(platform_username_lower);

-- Note on FK constraints for snapshot_notes and video_downloads:
-- SQLite does not support adding FK constraints to existing tables via ALTER TABLE.
-- The following relationships should be enforced at the application level:
--   - snapshot_notes.user_id -> users.id (ON DELETE CASCADE)
--   - snapshot_notes.tweet_id -> cached_tweets.tweet_id (ON DELETE CASCADE)
--   - video_downloads.saved_post_id -> saved_posts.id (ON DELETE SET NULL)
--
-- If full FK enforcement is needed, the tables must be recreated.
-- For now, we rely on application-level cleanup and periodic maintenance.
