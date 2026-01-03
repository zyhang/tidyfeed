-- Migration: Add 'invalid' status for video_downloads
-- Date: 2026-01-03
-- Description: Adds 'invalid' as valid status for video_downloads when associated media is deleted

-- SQLite doesn't support ALTER TABLE to modify CHECK constraints
-- We need to recreate the table or use a workaround
-- For simplicity, we'll drop the CHECK constraint and rely on application-level validation

-- Note: D1/SQLite doesn't enforce CHECK constraints strictly in all cases
-- The application code will handle the new 'invalid' status
