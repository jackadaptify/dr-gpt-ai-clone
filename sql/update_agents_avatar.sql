-- Add avatar_url column to agents table

ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Comment on column
COMMENT ON COLUMN agents.avatar_url IS 'URL of the agent avatar image';
