-- Owned cards: the "I own this" marks on the card checklist (DECISIONS.md,
-- "Card checklist view"). One row per version a member owns, with how many.
--
-- Paste into Supabase -> SQL Editor and run once. Safe to run twice.
--
-- Privacy: private by default. Row-level security lets a signed-in member
-- read, add, change and delete only their own rows; nobody else (other
-- members, signed-out visitors) can see them. Rows are deleted with the
-- account. No prices or values are stored.
--
-- side         'sports' (Fields & Floors) or 'fables' (Foils & Fables)
-- game         'mtg', 'pokemon', … on fables; the sport on sports
-- card_key     e.g. 'sheoldred-the-apocalypse' (lib/tcg/catalog.js)
-- version_key  e.g. 'dmu:107:f' = set : card number : finish

create table if not exists public.owned_cards (
  id           bigint generated always as identity primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  side         text not null default 'fables' check (side in ('sports', 'fables')),
  game         text not null check (char_length(game) between 1 and 40),
  card_key     text not null check (char_length(card_key) between 1 and 200),
  version_key  text not null check (char_length(version_key) between 1 and 200),
  qty          integer not null default 1 check (qty between 1 and 999),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, side, game, card_key, version_key)
);

create index if not exists owned_cards_user_card_idx
  on public.owned_cards (user_id, side, game, card_key);

alter table public.owned_cards enable row level security;

drop policy if exists "owned_cards: owner reads" on public.owned_cards;
create policy "owned_cards: owner reads" on public.owned_cards
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "owned_cards: owner adds" on public.owned_cards;
create policy "owned_cards: owner adds" on public.owned_cards
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "owned_cards: owner changes" on public.owned_cards;
create policy "owned_cards: owner changes" on public.owned_cards
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owned_cards: owner deletes" on public.owned_cards;
create policy "owned_cards: owner deletes" on public.owned_cards
  for delete to authenticated using (auth.uid() = user_id);

revoke all on public.owned_cards from anon;
grant select, insert, update, delete on public.owned_cards to authenticated;
