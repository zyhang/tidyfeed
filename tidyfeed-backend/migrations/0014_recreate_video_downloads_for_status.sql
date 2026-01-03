-- Migration: Recreate video_downloads table to update CHECK constraint for status
-- Date: 2026-01-03
-- Description: SQLite doesn't support ALTER TABLE for CHECK constraints. 
-- We recreate the table to add 'invalid' to the allowed statuses.

-- 1. Create temporary table with the correct schema
CREATE TABLE video_downloads_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    tweet_url TEXT NOT NULL,
    twitter_cookies TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'invalid')),
    r2_key TEXT,
    metadata TEXT,
    error_message TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    completed_at INTEGER,
    saved_post_id INTEGER,
    file_size INTEGER DEFAULT 0,
    task_type TEXT DEFAULT 'user_download',
    tweet_id TEXT,
    video_url TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Copy data from old table to new table
INSERT INTO video_downloads_new (
    id, user_id, tweet_url, twitter_cookies, status, r2_key, metadata, 
    error_message, created_at, completed_at, saved_post_id, file_size, 
    task_type, tweet_id, video_url
)
SELECT 
    id, user_id, tweet_url, twitter_cookies, status, r2_key, metadata, 
    error_message, created_at, completed_at, saved_post_id, file_size, 
    task_type, tweet_id, video_url
FROM video_downloads;

-- 3. Drop old table
DROP TABLE video_downloads;

-- 4. Rename new table to original name
ALTER TABLE video_downloads_new RENAME TO video_downloads;

-- 5. Recreate indexes
CREATE INDEX IF NOT EXISTS idx_video_downloads_user_id ON video_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_video_downloads_status ON video_downloads(status);
CREATE INDEX IF NOT EXISTS idx_video_downloads_created_at ON video_downloads(created_at);
CREATE INDEX IF NOT EXISTS idx_video_downloads_saved_post_id ON video_downloads(saved_post_id);
CREATE INDEX IF NOT EXISTS idx_video_downloads_tweet_id ON video_downloads(tweet_id);
CREATE INDEX IF NOT EXISTS idx_video_downloads_task_type ON video_downloads(task_type);
