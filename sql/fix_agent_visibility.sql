-- 1. Ensure RLS is enabled on agents table
alter table agents enable row level security;

-- 2. Policy for Admins: Full Access (Create, Read, Update, Delete)
-- Allows admins to see ALL agents (active or inactive) and manage them.
drop policy if exists "Admins can do everything on agents" on agents;
create policy "Admins can do everything on agents"
on agents
for all
to authenticated
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- 3. Policy for Regular Users: View Active Agents Only
-- Allows all logged-in users to see ONLY agents marked as 'is_active = true'.
drop policy if exists "Users can view active agents" on agents;
create policy "Users can view active agents"
on agents
for select
to authenticated
using (
  is_active = true
);

-- 4. Ensure permissions are granted to the authenticated role
-- (RLS policies filter the access, but the role needs basic privileges first)
grant select, insert, update, delete on table agents to authenticated;
