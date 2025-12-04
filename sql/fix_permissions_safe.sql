-- 1. Enable RLS (Security Best Practice)
alter table profiles enable row level security;
alter table agents enable row level security;

-- 2. Allow Authenticated users (logged in) to read profiles
-- This is necessary so the system can check if a user is an 'admin'
drop policy if exists "Profiles viewable by auth" on profiles;
create policy "Profiles viewable by auth"
on profiles for select
to authenticated
using (true);

-- 3. Grant basic Table permissions to Authenticated users
-- This allows the "authenticated" role to attempt actions, but RLS policies will still filter them.
-- We DO NOT grant these to 'anon' (unauthenticated users).
grant select, insert, update, delete on table agents to authenticated;
grant select on table profiles to authenticated;

-- 4. Set Admin Role (Manual Safety)
-- Instead of updating everyone, run this replacing the email with yours:
-- update profiles set role = 'admin' where email = 'seu_email@exemplo.com';
