-- 1. Create a secure function to check if user is admin
-- SECURITY DEFINER means this runs with the privileges of the creator, bypassing RLS
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- 2. Drop the problematic recursive policies
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can update app settings" on public.app_settings;
drop policy if exists "Admins can view all usage logs" on public.usage_logs;

-- 3. Re-create policies using the safe function

-- Profiles: Users see their own, Admins see all
create policy "Admins and Users view profiles" on public.profiles
  for select using (
    auth.uid() = id 
    or 
    is_admin()
  );

-- App Settings: Only admins update
create policy "Admins can update app settings" on public.app_settings
  for update using ( is_admin() );

-- Usage Logs: Admins view all
create policy "Admins can view all usage logs" on public.usage_logs
  for select using ( is_admin() );
