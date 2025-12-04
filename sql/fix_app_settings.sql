-- Ensure RLS is enabled
alter table public.app_settings enable row level security;

-- Grant permissions to authenticated users (so the API can try)
grant all on public.app_settings to authenticated;

-- Drop existing policies to start fresh
drop policy if exists "Admins can manage app settings" on public.app_settings;
drop policy if exists "Everyone can read app settings" on public.app_settings;

-- Policy: Admins can do ANYTHING (Select, Insert, Update, Delete)
create policy "Admins can manage app settings" on public.app_settings
  for all using ( is_admin() );

-- Policy: Everyone (authenticated) can READ settings (to know which models are enabled)
create policy "Everyone can read app settings" on public.app_settings
  for select using ( true );
