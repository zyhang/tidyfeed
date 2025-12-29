-- Migration: Recreate Tagging Schema
-- Created: 2025-12-29
-- Description: Fixes schema mismatch and unique constraints for multi-user tagging

DROP TABLE IF EXISTS tweet_tag_refs;
DROP TABLE IF EXISTS tags;

-- Tags table: unique per user
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

-- Tweet-Tag reference table
CREATE TABLE tweet_tag_refs (
    tweet_id TEXT NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tweet_id, tag_id),
    FOREIGN KEY (tweet_id) REFERENCES tweet_cache(tweet_id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Indices
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_tweet_tag_refs_tag_id ON tweet_tag_refs(tag_id);
CREATE INDEX idx_tweet_tag_refs_tweet_id ON tweet_tag_refs(tweet_id);
