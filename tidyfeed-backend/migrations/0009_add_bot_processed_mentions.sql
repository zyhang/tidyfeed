-- Migration: Add bot_processed_mentions table
-- Description: Track processed bot mentions in database instead of local file
-- Date: 2026-01-02

-- Store processed mention IDs to prevent duplicate processing
CREATE TABLE IF NOT EXISTS bot_processed_mentions (
    mention_id TEXT PRIMARY KEY,
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for cleanup of old records (optional future feature)
CREATE INDEX IF NOT EXISTS idx_bot_processed_mentions_processed_at 
ON bot_processed_mentions(processed_at);
