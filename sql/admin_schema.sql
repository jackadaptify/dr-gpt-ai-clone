-- Add role to profiles
alter table public.profiles 
add column role text default 'user';

-- Create app_settings table
create table public.app_settings (
  id uuid not null primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create usage_logs table
create table public.usage_logs (
  id uuid not null primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  model_id text not null,
  tokens_input int default 0,
  tokens_output int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.app_settings enable row level security;
alter table public.usage_logs enable row level security;

-- Policies for App Settings
-- Only admins can update settings
create policy "Admins can update app settings" on public.app_settings
  for update using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Everyone can read settings (to know which models are enabled)
create policy "Everyone can read app settings" on public.app_settings
  for select using (true);

-- Policies for Usage Logs
-- Admins can view all logs
create policy "Admins can view all usage logs" on public.usage_logs
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Users can view their own logs (optional, but good for transparency)
create policy "Users can view their own usage logs" on public.usage_logs
  for select using (auth.uid() = user_id);

-- System can insert logs (anyone authenticated can trigger a log insertion via backend logic, 
-- but usually we want this to be server-side. For client-side app, we allow insert own logs)
create policy "Users can insert their own usage logs" on public.usage_logs
  for insert with check (auth.uid() = user_id);

-- Policies for Profiles (Update for Admin View)
-- Admins can view all profiles
create policy "Admins can view all profiles" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Initial App Settings (Enable all models by default)
insert into public.app_settings (key, value)
values ('enabled_models', '["gpt-4o", "claude-sonnet-4-5", "gemini-flash", "grok-1", "deepseek-r1"]'::jsonb)
on conflict (key) do nothing;
