-- iOS app: Apple in-app purchase (via RevenueCat) and push notifications.

-- Which payment system granted Base: 'stripe' (website) or 'apple' (iOS app).
-- Lets an Apple expiry leave a Stripe subscriber alone, and vice versa.
alter table public.profiles
  add column if not exists billing_source text,
  add column if not exists iap_subscription_ends_at timestamptz;

update public.profiles
  set billing_source = 'stripe'
  where billing_source is null and stripe_subscription_id is not null and stripe_subscription_id <> '';

-- One row per device. Written only by the service role (API route + poller),
-- so RLS is on with no policies: anon/authenticated can't read or write it.
create table if not exists public.push_tokens (
  token        text primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  platform     text not null check (platform in ('ios', 'android')),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;
