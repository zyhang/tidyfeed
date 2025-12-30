-- Migration: Add missing columns to social_accounts
-- Description: Adds display_name, avatar_url, last_synced_at columns that were missing from initial deploy

ALTER TABLE social_accounts ADD COLUMN display_name TEXT;
ALTER TABLE social_accounts ADD COLUMN avatar_url TEXT;
ALTER TABLE social_accounts ADD COLUMN last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP;
