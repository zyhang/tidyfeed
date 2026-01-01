-- Migration: Add saved_post_id to video_downloads table
-- Date: 2026-01-01
-- Description: Links video downloads to saved posts for inline playback

-- Add saved_post_id column to video_downloads
-- ALTER TABLE video_downloads ADD COLUMN saved_post_id INTEGER;

-- Create index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_video_downloads_saved_post_id ON video_downloads(saved_post_id);
