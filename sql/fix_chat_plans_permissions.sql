-- FIX RLS POLICIES FOR CHAT AND PLANS
-- This script fixes the 403 Forbidden errors by ensuring correct RLS policies.

-- 1. SUBSCRIPTION PLANS (Allow read access to everyone)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Drop potentially conflicting policies
DROP POLICY IF EXISTS "Subscription plans are viewable by everyone" ON public.subscription_plans;
DROP POLICY IF EXISTS "Anyone can view subscription plans" ON public.subscription_plans;

-- Create a clear, permissive policy for SELECT
CREATE POLICY "Anyone can view subscription plans"
ON public.subscription_plans
FOR SELECT
USING (true);

-- Grant access to the table for anon and authenticated roles
GRANT SELECT ON public.subscription_plans TO anon, authenticated, service_role;


-- 2. PROFILES (Ensure users can read their own billing data)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing read policy to recreate it correctly
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Re-create the policy allowing users to see their own row
-- This includes the new columns: billing_plan_id, billing_status, etc.
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING ( auth.uid() = id );

-- Grant access to the table
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO service_role;


-- 3. EDGE FUNCTION PERMISSIONS (Optional but good practice)
-- Ensure authenticated users can invoke functions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
