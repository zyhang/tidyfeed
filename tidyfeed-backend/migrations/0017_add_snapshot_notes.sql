-- Add snapshot_notes table for storing user notes on highlighted text
-- Migration: 0017_add_snapshot_notes.sql

CREATE TABLE IF NOT EXISTS snapshot_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tweet_id TEXT NOT NULL,              -- Links to cached_tweets.tweet_id
    user_id TEXT NOT NULL,               -- Owner who created the note
    selected_text TEXT NOT NULL,         -- The highlighted text
    note_content TEXT NOT NULL,          -- User's note content
    text_offset_start INTEGER,           -- Character offset start for highlighting
    text_offset_end INTEGER,             -- Character offset end for highlighting
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup by tweet_id
CREATE INDEX IF NOT EXISTS idx_snapshot_notes_tweet_id ON snapshot_notes(tweet_id);

-- Index for user's notes
CREATE INDEX IF NOT EXISTS idx_snapshot_notes_user_id ON snapshot_notes(user_id);

-- Composite index for finding notes by tweet and user
CREATE INDEX IF NOT EXISTS idx_snapshot_notes_tweet_user ON snapshot_notes(tweet_id, user_id);
