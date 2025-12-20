-- Migration: Add Trial columns to profiles table

-- 1. Add columns if they don't exist
alter table public.profiles 
add column if not exists trial_status text default 'none' check (trial_status in ('none', 'active', 'expired', 'converted')),
add column if not exists trial_ends_at timestamp with time zone,
add column if not exists is_test boolean default false;

-- 2. Index for faster queries on trial status
create index if not exists idx_profiles_trial_status on public.profiles(trial_status);
create index if not exists idx_profiles_trial_ends_at on public.profiles(trial_ends_at);

-- 3. Update existing RLS if necessary (users can read own trial status)
-- The existing policy "Users can view own profile" (select) covers all columns, so no change needed there.

-- 4. Comment
comment on column public.profiles.trial_status is 'Status of the trial: none, active, expired, converted';
comment on column public.profiles.trial_ends_at is 'When the trial expires';
comment on column public.profiles.is_test is 'Flag to identify test/demo accounts created by admins';
