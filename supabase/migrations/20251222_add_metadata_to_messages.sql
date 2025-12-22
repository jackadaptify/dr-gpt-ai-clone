-- Add metadata column to messages table to store research results and other extra data
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Comment on column
COMMENT ON COLUMN public.messages.metadata IS 'Stores additional data like research results, citations, or tool outputs';
