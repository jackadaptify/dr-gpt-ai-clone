-- 1. Grant NECESSARY permissions (Standard for Supabase)
-- This allows the API to attempt to read/write, but RLS still filters the rows.
grant usage on schema public to authenticated;
grant select, update, insert on table public.profiles to authenticated;
grant select, update, insert on table public.app_settings to authenticated;
grant select, insert on table public.usage_logs to authenticated;

-- 2. Ensure the secure check function exists and is executable
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

grant execute on function public.is_admin() to authenticated;

-- 3. Re-apply STRICT RLS Policies
-- Drop old policies to ensure clean state
drop policy if exists "Admins and Users view profiles" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Allow reading all profiles" on public.profiles; -- Drop the one you didn't want

-- Policy: Users see ONLY their own profile. Admins see ALL.
create policy "Strict Profile Access" on public.profiles
  for select using (
    auth.uid() = id  -- User sees themselves
    or 
    is_admin()       -- Admin sees everyone
  );

-- Policy: Users can update ONLY their own profile.
create policy "Strict Profile Update" on public.profiles
  for update using (
    auth.uid() = id
  );

-- Policy: System/Signup creates profile (Insert)
create policy "Strict Profile Insert" on public.profiles
  for insert with check (
    auth.uid() = id
  );
