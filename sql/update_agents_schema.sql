-- Add new columns for Advanced Agent Builder

ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS ice_breakers jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS capabilities jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS knowledge_files jsonb DEFAULT '[]'::jsonb;

-- Comment on columns
COMMENT ON COLUMN agents.ice_breakers IS 'List of conversation starters';
COMMENT ON COLUMN agents.capabilities IS 'List of enabled capabilities (web_search, image_generation, etc.)';
COMMENT ON COLUMN agents.knowledge_files IS 'List of uploaded file metadata';
