-- Migration: Add media_size column to cached_tweets
ALTER TABLE cached_tweets ADD COLUMN media_size INTEGER DEFAULT 0;
