-- Migration: Add research_credits to profiles
-- Description: Adds a column to track credits for deep research usage.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'research_credits') THEN
        ALTER TABLE public.profiles ADD COLUMN research_credits INTEGER DEFAULT 10 NOT NULL;
    END IF;
END $$;

-- Optional: Create a function to safely deduct credits transactionally
CREATE OR REPLACE FUNCTION public.deduct_research_credit(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_credits INTEGER;
BEGIN
    -- Lock the row for update to prevent race conditions
    SELECT research_credits INTO current_credits
    FROM public.profiles
    WHERE id = user_id
    FOR UPDATE;

    IF current_credits > 0 THEN
        UPDATE public.profiles
        SET research_credits = research_credits - 1
        WHERE id = user_id;
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;
