-- Migration: Add pinned_at to saved_posts
-- Created: 2025-12-30
-- Description: Adds functionality to pin posts

ALTER TABLE saved_posts ADD COLUMN pinned_at DATETIME;

-- Create index for sorting performance
CREATE INDEX idx_saved_posts_pinned_at ON saved_posts(pinned_at);
