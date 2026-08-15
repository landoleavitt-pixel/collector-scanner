-- Stripe subscription columns on profiles.
--
-- The app keys everything off the existing `tier` column ('free' | 'base'),
-- which the Stripe webhook keeps in sync. These columns store the Stripe-side
-- identifiers so the webhook can map renewal/cancellation events (which only
-- carry a customer id) back to the right user, and so the customer-portal
-- route can open the right billing session.
--
-- Kept separate from the legacy ls_* columns so the two processors never
-- collide on IDs.

alter table public.profiles
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text;

create index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;
