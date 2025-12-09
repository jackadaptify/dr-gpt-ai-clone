-- Add avatar_position column to agents table

ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS avatar_position text DEFAULT 'center';

-- Comment on column
COMMENT ON COLUMN agents.avatar_position IS 'CSS object-position value for the avatar image (e.g., center, top, bottom)';
