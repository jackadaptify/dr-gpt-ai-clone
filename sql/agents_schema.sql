-- Create agents table
create table if not exists agents (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  system_prompt text not null,
  model_id text not null,
  icon text default 'IconRobot',
  color text default 'from-blue-500 to-cyan-500',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table agents enable row level security;

-- Policies

-- Everyone can read active agents
create policy "Agents are viewable by everyone"
  on agents for select
  using (true);

-- Only admins can insert
create policy "Admins can insert agents"
  on agents for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Only admins can update
create policy "Admins can update agents"
  on agents for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Only admins can delete
create policy "Admins can delete agents"
  on agents for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
