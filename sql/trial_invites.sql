-- Create trial_invites table
create table if not exists public.trial_invites (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  trial_days int not null default 3,
  status text not null default 'active' check (status in ('active', 'used', 'revoked', 'expired')),
  used_at timestamptz,
  used_by uuid references auth.users(id),
  note text,
  is_test boolean default true
);

-- Enable RLS
alter table public.trial_invites enable row level security;

-- Policies
-- 1. Admin can do everything (CRUD)
create policy "Admins can do everything on trial_invites"
  on public.trial_invites
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- 2. Service Role can do everything (Implicit, but good to be explicit for clarity if needed, though usually service_role bypasses RLS)
-- No policy needed for service_role as it bypasses RLS.

-- 3. Public/Anon: NO ACCESS
-- We explicitly do NOT create policies for public/anon users.
-- This ensures they cannot select/insert/update/delete directly via client SDK.
