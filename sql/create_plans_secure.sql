-- SECURE MIGRATION: SUBSCRIPTION PLANS HIERARCHY

-- 1. Ensure Table Exists
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'BRL',
    features JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. EXTREME SECURITY: Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- 3. POLICY: READ (Public can read active plans)
DROP POLICY IF EXISTS "Public read access" ON public.subscription_plans;
CREATE POLICY "Public read access"
ON public.subscription_plans FOR SELECT
USING (true);

-- 4. POLICY: WRITE (ONLY ADMINS)
-- Prevent modification by anyone who isn't an admin
DROP POLICY IF EXISTS "Admin write access" ON public.subscription_plans;
CREATE POLICY "Admin write access"
ON public.subscription_plans FOR ALL
USING (
    exists (
        select 1 from public.profiles
        where id = auth.uid()
        and role = 'admin'
    )
);

-- 5. Seed Hierarchy Plans (Upsert)
INSERT INTO public.subscription_plans (slug, name, price_cents, features)
VALUES 
    ('starter', 'Starter', 4900, '{"description": "Plano de entrada"}'::jsonb),
    ('pro', 'Pro', 9700, '{"description": "Mais popular"}'::jsonb),
    ('ultra', 'Ultra', 19700, '{"description": "Acesso ilimitado"}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET 
    name = excluded.name,
    price_cents = excluded.price_cents,
    features = excluded.features;
