-- Migration: Add snapshot video task support to video_downloads
-- Date: 2026-01-03
-- Description: Adds columns to support snapshot video caching tasks

-- Add task_type column to differentiate between user downloads and snapshot video caching
ALTER TABLE video_downloads ADD COLUMN task_type TEXT DEFAULT 'user_download';

-- Add tweet_id column to link snapshot videos to cached_tweets
ALTER TABLE video_downloads ADD COLUMN tweet_id TEXT;

-- Add video_url column for direct CDN download (no cookies needed for snapshot videos)
ALTER TABLE video_downloads ADD COLUMN video_url TEXT;

-- Create index for tweet_id lookups
CREATE INDEX IF NOT EXISTS idx_video_downloads_tweet_id ON video_downloads(tweet_id);
CREATE INDEX IF NOT EXISTS idx_video_downloads_task_type ON video_downloads(task_type);
