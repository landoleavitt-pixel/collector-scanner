-- Fields & Floors: subscription tracking
-- Run this in Supabase SQL editor (Dashboard → SQL Editor → New query)
--
-- Adds a `profiles` table that shadows auth.users (1-to-1).
-- The webhook endpoint writes here; the poller reads here to gate alerts.

create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  -- Tier: 'free' | 'base' | 'pro' (future)
  tier            text not null default 'free',
  -- Lemon Squeezy identifiers for webhook correlation
  ls_customer_id  text,
  ls_subscription_id text,
  -- Trial window
  trial_ends_at   timestamptz,
  -- When the current paid period ends (null = free/no subscription)
  subscription_ends_at timestamptz,
  -- Grandfathered founding members keep alerts even on free tier
  is_founding_member boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-create a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Back-fill profiles for any existing users
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Mark all existing users as founding members so their alerts keep working
update public.profiles set is_founding_member = true;

-- RLS: users can read their own profile; only service role can write
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Service role full access"
  on public.profiles for all
  to service_role
  using (true)
  with check (true);

-- Postgres GRANTs — RLS policies don't override base table permissions.
-- Both roles need explicit grants in addition to RLS.
grant select, insert, update, delete on public.profiles to service_role;
grant select on public.profiles to authenticated;

-- updated_at auto-stamp
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
