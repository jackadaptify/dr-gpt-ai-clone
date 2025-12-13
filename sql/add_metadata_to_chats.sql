-- Add metadata column to chats table
ALTER TABLE chats ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Comment on column
COMMENT ON COLUMN chats.metadata IS 'Flexible metadata for storing extra context like estimated values, patient demographics, etc.';
