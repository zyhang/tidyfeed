-- Migration: Add Tagging System
-- Created: 2025-12-29
-- Description: Adds tags, tweet_cache, and tweet_tag_refs tables for tweet tagging functionality

-- Tags table: stores unique tag names
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tweet cache table: caches tweet data by tweet_id
CREATE TABLE IF NOT EXISTS tweet_cache (
    tweet_id TEXT PRIMARY KEY,
    data_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tweet-Tag reference table: many-to-many relationship between tweets and tags
CREATE TABLE IF NOT EXISTS tweet_tag_refs (
    tweet_id TEXT NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tweet_id, tag_id),
    FOREIGN KEY (tweet_id) REFERENCES tweet_cache(tweet_id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Index for efficient tag-based queries
CREATE INDEX IF NOT EXISTS idx_tweet_tag_refs_tag_id ON tweet_tag_refs(tag_id);

-- Index for efficient tweet-based queries
CREATE INDEX IF NOT EXISTS idx_tweet_tag_refs_tweet_id ON tweet_tag_refs(tweet_id);
