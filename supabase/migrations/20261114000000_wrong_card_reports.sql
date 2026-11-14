-- "Wrong card?" reports: a shopper tells us a listing isn't the card we said
-- (DECISIONS.md 2026-11-14, "Foils & Fables: more unique and powerful").
--
-- Paste into Supabase -> SQL Editor and run once. Safe to run twice.
--
-- What a row holds, and nothing else:
--   listing_id   the eBay listing's id (public on eBay)
--   our_label    what we said the listing was, e.g. "Charizard · Base Set 4/102"
--   side         'sports' or 'fables'
--   game         the card game, when there is one
--   reason       one of a fixed list (no free text, so no personal details)
--   user_id      the account id, only when the person was signed in; empty otherwise
--   created_at   when
-- No name, email, IP address, browser details or location are stored.
--
-- Security: server only. Row-level security is on with NO policies and the
-- public roles have no rights, so nobody can read, add or change rows from
-- the browser. Only the service role used by /api/wrong-card on the server
-- writes them (rate limited there). Rows go with the account when it's deleted,
-- and are cleared after 180 days.

create table if not exists public.wrong_card_reports (
  id          bigint generated always as identity primary key,
  listing_id  text not null check (char_length(listing_id) between 1 and 64),
  our_label   text not null check (char_length(our_label) between 1 and 200),
  side        text not null check (side in ('sports', 'fables')),
  game        text check (game is null or char_length(game) between 1 and 40),
  reason      text check (reason is null or reason in ('different_card', 'different_version', 'not_a_card', 'fake_or_custom', 'other')),
  user_id     uuid references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists wrong_card_reports_listing_idx on public.wrong_card_reports (listing_id);
create index if not exists wrong_card_reports_created_idx on public.wrong_card_reports (created_at);

alter table public.wrong_card_reports enable row level security;

revoke all on table public.wrong_card_reports from anon, authenticated;
grant select, insert, delete on table public.wrong_card_reports to service_role;

-- Clear reports after 180 days (needs the pg_cron extension, already used by
-- the alert checker's schedule). Remove these lines if pg_cron isn't on.
select cron.unschedule('wrong-card-reports-cleanup')
  where exists (select 1 from cron.job where jobname = 'wrong-card-reports-cleanup');
select cron.schedule('wrong-card-reports-cleanup', '17 4 * * *',
  $$delete from public.wrong_card_reports where created_at < now() - interval '180 days'$$);
