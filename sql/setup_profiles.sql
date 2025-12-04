-- Create a table for public profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  role text default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Drop old policies to be sure
drop policy if exists "Public profiles are viewable by everyone" on profiles;
drop policy if exists "Profiles are viewable by authenticated users" on profiles;
drop policy if exists "Users can view own profile" on profiles;
drop policy if exists "Users can insert their own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;

-- New Policy: Users see ONLY themselves. No exceptions in direct table access.
-- SECURITY: STRICT RLS
-- Users can ONLY see their own profile.
-- Admins must use the secure RPC function.
create policy "Users can view own profile"
  on profiles for select
  to authenticated
  using ( auth.uid() = id );

create policy "Users can insert their own profile"
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- Create a trigger to sync new users from auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Secure RPC function for Admins to fetch all users
-- This bypasses RLS but includes an explicit role check
create or replace function public.get_all_users()
returns setof public.profiles
language plpgsql
security definer
as $$
begin
  -- Check if the calling user is an admin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Access denied. Admin role required.';
  end if;

  -- Return all profiles
  return query select * from public.profiles order by created_at desc;
end;
$$;

-- Trigger the function every time a user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill existing users (might need to be run manually if permissions deny access to auth.users)
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;
