-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    custom_instructions TEXT,
    response_preferences TEXT,
    theme TEXT DEFAULT 'dark',
    language TEXT DEFAULT 'pt-BR',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own settings"
    ON user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
    ON user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON user_settings FOR UPDATE
    USING (auth.uid() = user_id);
