-- Add preferences and custom_ai_prompt to users table
ALTER TABLE users ADD COLUMN preferences TEXT DEFAULT '{}';
ALTER TABLE users ADD COLUMN custom_ai_prompt TEXT;
