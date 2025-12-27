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

-- Insert default admin user
-- Password: 111111 (bcrypt hash)
INSERT OR IGNORE INTO admins (email, password_hash) VALUES (
    'zyhang@gmail.com',
    '$2b$10$BJJrdwWWqO0cdPl.NrZXm.6Ix7Q337GOs.FBGaFsjwQOWVq0HzEHq'
);
