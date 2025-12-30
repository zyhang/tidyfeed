-- Migration: Add Social Accounts
-- Description: Stores linked social media accounts with profile metadata

CREATE TABLE IF NOT EXISTS social_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL,          -- 'x', 'instagram', 'reddit'
    platform_user_id TEXT NOT NULL,   -- Unique ID from the platform (e.g., id_str)
    platform_username TEXT,           -- Handle (e.g., elonmusk)
    display_name TEXT,                -- Profile Name (e.g., Elon Musk)
    avatar_url TEXT,                  -- Profile Image URL
    last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(platform, platform_user_id), -- One social account per TidyFeed user
    UNIQUE(user_id, platform)           -- One account per platform per user
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id);
