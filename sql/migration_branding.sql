-- Add model_id column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS model_id TEXT;

-- Index for performance if we ever query by model
CREATE INDEX IF NOT EXISTS idx_messages_model_id ON messages(model_id);
