-- Apple tokens: lets account deletion revoke Sign in with Apple
-- (App Review 5.1.1(v); lib/appleAuth.js).
--
-- Paste into Supabase -> SQL Editor and run once. Safe to run twice.
--
-- One row per member who signed in with Apple in the iPhone app: the
-- refresh token Apple gives us in exchange for the sign-in code. Its only
-- use is the revoke call when the member deletes their account; then the row
-- is deleted.
--
-- Security: server only. Row-level security is on with NO policies, and all
-- table rights are taken away from the public roles, so signed-in members
-- and signed-out visitors can't read, add, change or delete any row, not even
-- their own. Only the service role (used by /api/account/apple-token and
-- /api/account/delete on the server) can reach it. A token alone can't sign
-- anyone in: using it also needs our Apple private key, which lives only in
-- Vercel's environment variables. Rows are removed with the account.

create table if not exists public.apple_tokens (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  refresh_token  text not null check (char_length(refresh_token) between 1 and 2000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.apple_tokens enable row level security;

revoke all on table public.apple_tokens from anon, authenticated;
grant select, insert, update, delete on table public.apple_tokens to service_role;
