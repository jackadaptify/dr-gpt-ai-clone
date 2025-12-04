-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    model_used TEXT,
    agent_id TEXT
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('user', 'assistant', 'model')) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chats
DROP POLICY IF EXISTS "Users can only view their own chats" ON chats;
CREATE POLICY "Users can only view their own chats"
    ON chats FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own chats" ON chats;
CREATE POLICY "Users can insert their own chats"
    ON chats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own chats" ON chats;
CREATE POLICY "Users can update their own chats"
    ON chats FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own chats" ON chats;
CREATE POLICY "Users can delete their own chats"
    ON chats FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for messages
-- Users can see messages if they own the chat
DROP POLICY IF EXISTS "Users can view messages of their chats" ON messages;
CREATE POLICY "Users can view messages of their chats"
    ON messages FOR SELECT
    USING (
        chat_id IN (
            SELECT id FROM chats WHERE user_id = auth.uid()
        )
    );

-- Users can insert messages into their chats
DROP POLICY IF EXISTS "Users can insert messages into their chats" ON messages;
CREATE POLICY "Users can insert messages into their chats"
    ON messages FOR INSERT
    WITH CHECK (
        chat_id IN (
            SELECT id FROM chats WHERE user_id = auth.uid()
        )
    );

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at ASC);
