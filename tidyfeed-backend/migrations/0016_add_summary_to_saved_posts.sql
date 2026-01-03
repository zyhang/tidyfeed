-- Add summary column to saved_posts for caching AI-generated summaries
ALTER TABLE saved_posts ADD COLUMN summary TEXT;
