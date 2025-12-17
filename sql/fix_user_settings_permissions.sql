-- Fix permissions for user_settings table

-- 1. Grant permissions to authenticated users
GRANT ALL ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;

-- 2. Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON public.user_settings;

-- 4. Re-create policies
CREATE POLICY "Users can view their own settings"
    ON public.user_settings FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
    ON public.user_settings FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON public.user_settings FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- Optional: Allow delete (usually not needed for settings, but good for completeness in some designs)
-- CREATE POLICY "Users can delete their own settings"
--     ON public.user_settings FOR DELETE
--     TO authenticated
--     USING (auth.uid() = user_id);
