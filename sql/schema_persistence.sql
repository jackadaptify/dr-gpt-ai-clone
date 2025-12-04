-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid(),
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    model_id TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'model')),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can only view their own chats" ON chats;
DROP POLICY IF EXISTS "Users can insert their own chats" ON chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON chats;
DROP POLICY IF EXISTS "Users can delete their own chats" ON chats;
DROP POLICY IF EXISTS "Users can view messages of their chats" ON messages;
DROP POLICY IF EXISTS "Users can insert messages into their chats" ON messages;

-- Create policies for chats
CREATE POLICY "Users can only view their own chats"
    ON chats FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chats"
    ON chats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats"
    ON chats FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats"
    ON chats FOR DELETE
    USING (auth.uid() = user_id);

-- Create policies for messages
CREATE POLICY "Users can view messages of their chats"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chats
            WHERE chats.id = messages.chat_id
            AND chats.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages into their chats"
    ON messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chats
            WHERE chats.id = messages.chat_id
            AND chats.user_id = auth.uid()
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at ASC);
