-- TidyFeed Database Schema

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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reports_blocked_x_id ON reports(blocked_x_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

-- Users table (Google OAuth)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,  -- UUID stored as TEXT for D1 compatibility
    google_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Saved posts table (bookmarked X posts)
CREATE TABLE IF NOT EXISTS saved_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    x_post_id TEXT NOT NULL,
    content TEXT,
    media_urls TEXT,  -- JSON array stored as TEXT
    author_info TEXT,  -- JSON object stored as TEXT
    url TEXT,
    platform TEXT DEFAULT 'x',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, x_post_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_created_at ON saved_posts(created_at);

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

-- Insert default admin user
-- Password: 111111 (bcrypt hash)
INSERT OR IGNORE INTO admins (email, password_hash) VALUES (
    'zyhang@gmail.com',
    '$2b$10$BJJrdwWWqO0cdPl.NrZXm.6Ix7Q337GOs.FBGaFsjwQOWVq0HzEHq'
);
