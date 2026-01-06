-- TidyFeed Database Schema (Baseline)
-- This file represents the complete schema after all migrations.
-- For new environments, run this file OR run all migrations in order.
-- Last updated: 2026-01-05

-- ============================================
-- CORE TABLES
-- ============================================

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id TEXT NOT NULL,
    reporter_type TEXT NOT NULL CHECK (reporter_type IN ('guest', 'google')),
    blocked_x_id TEXT NOT NULL,
    blocked_x_name TEXT,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (reporter_id, blocked_x_id)
);

CREATE INDEX IF NOT EXISTS idx_reports_blocked_x_id ON reports(blocked_x_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

-- Users table (Google OAuth)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    storage_usage INTEGER DEFAULT 0,
    plan TEXT DEFAULT 'free',
    plan_expires_at DATETIME,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);

-- ============================================
-- SAVED POSTS & TAGGING
-- ============================================

-- Saved posts table (bookmarked X posts)
CREATE TABLE IF NOT EXISTS saved_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    x_post_id TEXT NOT NULL,
    content TEXT,
    media_urls TEXT,
    author_info TEXT,
    url TEXT,
    platform TEXT DEFAULT 'x',
    pinned_at DATETIME,
    summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, x_post_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_created_at ON saved_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_saved_posts_pinned_at ON saved_posts(pinned_at);

-- Tags table (user-defined tags)
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

-- Post-tags junction table
CREATE TABLE IF NOT EXISTS post_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    saved_post_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    FOREIGN KEY (saved_post_id) REFERENCES saved_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE (saved_post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_post_tags_saved_post_id ON post_tags(saved_post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON post_tags(tag_id);

-- ============================================
-- SOCIAL ACCOUNTS (X identity linking)
-- ============================================

CREATE TABLE IF NOT EXISTS social_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    platform_user_id TEXT NOT NULL,
    platform_username TEXT,
    platform_username_lower TEXT,
    display_name TEXT,
    avatar_url TEXT,
    last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(platform, platform_user_id),
    UNIQUE(user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_accounts_platform_username_lower ON social_accounts(platform, platform_username_lower);
CREATE INDEX IF NOT EXISTS idx_social_accounts_username_lower ON social_accounts(platform_username_lower);

-- ============================================
-- VIDEO DOWNLOADS (Cloud download queue)
-- ============================================

CREATE TABLE IF NOT EXISTS video_downloads (
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (saved_post_id) REFERENCES saved_posts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_video_downloads_user_id ON video_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_video_downloads_status ON video_downloads(status);
CREATE INDEX IF NOT EXISTS idx_video_downloads_created_at ON video_downloads(created_at);
CREATE INDEX IF NOT EXISTS idx_video_downloads_saved_post_id ON video_downloads(saved_post_id);
CREATE INDEX IF NOT EXISTS idx_video_downloads_tweet_id ON video_downloads(tweet_id);
CREATE INDEX IF NOT EXISTS idx_video_downloads_task_type ON video_downloads(task_type);

-- ============================================
-- CACHED TWEETS (Snapshot storage)
-- ============================================

CREATE TABLE IF NOT EXISTS cached_tweets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tweet_id TEXT UNIQUE NOT NULL,
    cached_data TEXT NOT NULL,
    comments_data TEXT,
    snapshot_url TEXT,
    media_size INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cached_tweets_tweet_id ON cached_tweets(tweet_id);
CREATE INDEX IF NOT EXISTS idx_cached_tweets_created_at ON cached_tweets(created_at);

-- ============================================
-- SNAPSHOT NOTES (User annotations)
-- ============================================

CREATE TABLE IF NOT EXISTS snapshot_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tweet_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    selected_text TEXT NOT NULL,
    note_content TEXT NOT NULL,
    text_offset_start INTEGER,
    text_offset_end INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tweet_id) REFERENCES cached_tweets(tweet_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_snapshot_notes_tweet_id ON snapshot_notes(tweet_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_notes_user_id ON snapshot_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_notes_tweet_user ON snapshot_notes(tweet_id, user_id);

-- ============================================
-- BOT & SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS bot_processed_mentions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mention_id TEXT UNIQUE NOT NULL,
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bot_processed_mentions_mention_id ON bot_processed_mentions(mention_id);

CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- USAGE TRACKING (Subscription quotas)
-- ============================================

CREATE TABLE IF NOT EXISTS usage_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    feature TEXT NOT NULL,  -- 'collection', 'ai_summary', 'storage'
    period TEXT NOT NULL,   -- 'YYYY-MM' format for monthly tracking
    count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, feature, period)
);

CREATE INDEX IF NOT EXISTS idx_usage_records_lookup ON usage_records(user_id, feature, period);

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert default admin user (Password: 111111)
INSERT OR IGNORE INTO admins (email, password_hash) VALUES (
    'zyhang@gmail.com',
    '$2b$10$BJJrdwWWqO0cdPl.NrZXm.6Ix7Q337GOs.FBGaFsjwQOWVq0HzEHq'
);
