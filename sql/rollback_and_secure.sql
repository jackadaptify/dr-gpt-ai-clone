-- 1. REVOKE unsafe permissions (Lock the doors)
revoke all privileges on all tables in schema public from anon;
revoke all privileges on all tables in schema public from public;

-- 2. Drop the unsafe "Public profiles" policy
drop policy if exists "Public profiles" on profiles;

-- 3. Re-apply SAFE permissions (Allow only logged in users)
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon; -- Read-only for anon (if needed for login), usually restricted by RLS

-- 4. Re-apply SAFE RLS Policies
alter table profiles enable row level security;
alter table agents enable row level security;

-- Allow authenticated users to read profiles (to check admin status)
create policy "Profiles viewable by auth"
on profiles for select
to authenticated
using (true);

-- 5. Note on Admins:
-- The previous script made everyone an admin. 
-- If you want to remove admin from everyone except you, run:
-- update profiles set role = 'user' where email != 'seu_email@exemplo.com';
