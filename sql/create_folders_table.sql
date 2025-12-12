-- Enable UUID extension just in case
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create Folders Table
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Grants (Fix for Permission Denied)
GRANT ALL ON TABLE folders TO authenticated;
GRANT ALL ON TABLE folders TO service_role;

-- Policies
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'folders' AND policyname = 'Users can view their own folders') THEN
        CREATE POLICY "Users can view their own folders" ON folders FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'folders' AND policyname = 'Users can insert their own folders') THEN
        CREATE POLICY "Users can insert their own folders" ON folders FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'folders' AND policyname = 'Users can update their own folders') THEN
        CREATE POLICY "Users can update their own folders" ON folders FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'folders' AND policyname = 'Users can delete their own folders') THEN
        CREATE POLICY "Users can delete their own folders" ON folders FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Add Folder ID to Chats if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chats' AND column_name = 'folder_id') THEN
        ALTER TABLE chats ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
    END IF;
END $$;
