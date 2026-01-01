-- Migration: Add video_downloads table for Cloud Video Downloader feature
-- Date: 2026-01-01
-- Description: Creates video_downloads table for storing video download tasks
-- SECURITY NOTE: twitter_cookies column MUST be set to NULL after download completes

-- Video downloads table (Cloud Video Downloader)
CREATE TABLE IF NOT EXISTS video_downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    tweet_url TEXT NOT NULL,
    twitter_cookies TEXT,  -- Temporary storage: auth_token + ct0, MUST be deleted after download
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    r2_key TEXT,  -- Path to video file in R2 bucket
    metadata TEXT,  -- JSON: video info (title, duration, resolution, etc.)
    error_message TEXT,  -- Error details if status = 'failed'
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    completed_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_downloads_user_id ON video_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_video_downloads_status ON video_downloads(status);
CREATE INDEX IF NOT EXISTS idx_video_downloads_created_at ON video_downloads(created_at);
