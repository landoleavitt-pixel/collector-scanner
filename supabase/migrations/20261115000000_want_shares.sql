-- Want-list share links: a member can turn on a private link that shows the
-- versions they still need (DECISIONS.md 2026-11-14, "more unique and powerful").
--
-- Paste into Supabase -> SQL Editor and run once. Safe to run twice.
--
-- One row per member who has sharing turned on:
--   user_id     the member
--   token       a long random code that is the link (/fables/wants/<token>)
--   created_at  when sharing was turned on
-- Turning sharing off deletes the row, so the old link stops working at once.
-- Turning it on again makes a new code. Nothing else is stored.
--
-- Privacy: off by default. Owned marks stay private (owned_cards is
-- unchanged). Row-level security lets a member see, add and delete only
-- their own row. The public page is served by our server, which looks up the
-- token with the service role and shows only the still-need list: card
-- families, the versions missing, and what's for sale. Never the member's
-- name, email, account id or owned counts. Rows go with the account.

create table if not exists public.want_shares (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  token       text not null unique check (char_length(token) between 20 and 64),
  created_at  timestamptz not null default now()
);

alter table public.want_shares enable row level security;

drop policy if exists "want_shares: owner reads" on public.want_shares;
create policy "want_shares: owner reads" on public.want_shares
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "want_shares: owner adds" on public.want_shares;
create policy "want_shares: owner adds" on public.want_shares
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "want_shares: owner deletes" on public.want_shares;
create policy "want_shares: owner deletes" on public.want_shares
  for delete to authenticated using (auth.uid() = user_id);

revoke all on table public.want_shares from anon;
grant select, insert, delete on table public.want_shares to authenticated;
grant select, insert, delete on table public.want_shares to service_role;
