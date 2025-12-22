create table public.consumed_stripe_sessions (
    session_id text primary key,
    consumed_at timestamp with time zone default now(),
    email text,
    user_id uuid references auth.users(id)
);

alter table public.consumed_stripe_sessions enable row level security;
-- No public access needed, only service role will access this
