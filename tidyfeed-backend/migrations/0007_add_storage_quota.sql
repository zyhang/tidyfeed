-- Migration: Add storage usage tracking columns
-- Date: 2026-01-02
-- Description: Add storage_usage to users and file_size to video_downloads

-- Add storage_usage column to users table (default 0 bytes)
ALTER TABLE users ADD COLUMN storage_usage INTEGER DEFAULT 0;

-- Add file_size column to video_downloads table (default 0 bytes)
ALTER TABLE video_downloads ADD COLUMN file_size INTEGER DEFAULT 0;
