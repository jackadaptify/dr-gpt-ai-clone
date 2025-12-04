-- Create profiles table
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone
);

-- Create chats table
create table public.chats (
  id uuid not null primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text,
  model_id text,
  agent_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create messages table
create table public.messages (
  id uuid not null primary key default gen_random_uuid(),
  chat_id uuid references public.chats on delete cascade not null,
  role text not null,
  content text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;

-- Create policies
create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can view their own chats" on public.chats
  for select using (auth.uid() = user_id);

create policy "Users can insert their own chats" on public.chats
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own chats" on public.chats
  for update using (auth.uid() = user_id);

create policy "Users can delete their own chats" on public.chats
  for delete using (auth.uid() = user_id);

create policy "Users can view messages of their chats" on public.messages
  for select using (
    exists (
      select 1 from public.chats
      where public.chats.id = public.messages.chat_id
      and public.chats.user_id = auth.uid()
    )
  );

create policy "Users can insert messages to their chats" on public.messages
  for insert with check (
    exists (
      select 1 from public.chats
      where public.chats.id = public.messages.chat_id
      and public.chats.user_id = auth.uid()
    )
  );

-- Create a trigger to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
