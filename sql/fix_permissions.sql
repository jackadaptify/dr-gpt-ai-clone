-- 1. Enable RLS on profiles (if not already)
alter table profiles enable row level security;

-- 2. Allow everyone to read profiles (Required for the 'agents' policy to check the role)
-- If this policy already exists, it might error, so we drop it first to be safe
drop policy if exists "Public profiles" on profiles;
create policy "Public profiles"
on profiles for select
using (true);

-- 3. Allow users to update their own profile
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
on profiles for update
using (auth.uid() = id);

-- 4. EMERGENCY: Make ALL existing users admins (for development)
-- This ensures your user definitely has the 'admin' role
update profiles
set role = 'admin';

-- 5. Grant usage on schema (just in case)
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all privileges on all tables in schema public to postgres, anon, authenticated, service_role;
