-- Add cached_tweets table for storing TikHub tweet data and HTML snapshots
-- Migration: 0010_add_cached_tweets.sql

CREATE TABLE IF NOT EXISTS cached_tweets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tweet_id TEXT UNIQUE NOT NULL,
    cached_data TEXT NOT NULL,           -- Full JSON from TikHub API
    snapshot_r2_key TEXT,                -- R2 key for the HTML snapshot file
    comments_data TEXT,                  -- JSON comments data (optional)
    comments_count INTEGER DEFAULT 0,    -- Number of cached comments
    has_media INTEGER DEFAULT 0,         -- 1 if tweet has media
    has_video INTEGER DEFAULT 0,         -- 1 if tweet has video
    has_quoted_tweet INTEGER DEFAULT 0,  -- 1 if tweet has quoted tweet
    cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,                 -- Optional expiration for cache cleanup
    source TEXT DEFAULT 'tikhub',        -- Source API (for future multi-source support)
    error_message TEXT                   -- Last error if caching failed
);

-- Index for fast lookup by tweet_id
CREATE INDEX IF NOT EXISTS idx_cached_tweets_tweet_id ON cached_tweets(tweet_id);

-- Index for cache expiration queries
CREATE INDEX IF NOT EXISTS idx_cached_tweets_expires_at ON cached_tweets(expires_at);

-- Index for finding tweets with snapshots
CREATE INDEX IF NOT EXISTS idx_cached_tweets_snapshot ON cached_tweets(snapshot_r2_key);
