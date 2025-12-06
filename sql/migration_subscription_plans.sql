-- 1. Create subscription_plans table
create table if not exists public.subscription_plans (
  id uuid default gen_random_uuid() primary key,
  slug text not null unique,
  name text not null,
  price_cents integer not null,
  currency text default 'BRL',
  features jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on subscription_plans
alter table public.subscription_plans enable row level security;

-- Allow read access to everyone (or authenticated users)
create policy "Subscription plans are viewable by everyone"
  on subscription_plans for select
  using ( true );

-- 2. Add billing fields to profiles table
alter table public.profiles 
add column if not exists billing_plan_id uuid references public.subscription_plans(id),
add column if not exists billing_status text default 'free', -- active, canceled, past_due, free
add column if not exists billing_current_period_end timestamp with time zone;

-- 3. Seed initial plans
insert into public.subscription_plans (slug, name, price_cents, features)
values 
  ('user_97', 'Plano Inicial', 9700, '{"agents_limit": 5, "requests_limit": 1000}'::jsonb),
  ('user_147', 'Plano Pro', 14700, '{"agents_limit": 999, "requests_limit": 99999}'::jsonb)
on conflict (slug) do update set 
  name = excluded.name,
  price_cents = excluded.price_cents,
  features = excluded.features;
