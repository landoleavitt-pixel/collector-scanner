-- Foils & Fables: one account, two sides.
--
-- Saved searches and starred cards now say which side of the site they
-- belong to: 'sports' (Fields & Floors) or 'fables' (Foils & Fables, the
-- card-game side at /fables). Everything saved before today is sports, so
-- the default fills existing rows with 'sports'. Nothing else changes.
--
-- The alert checker (supabase/functions/poller) runs 'fables' saved searches
-- against /api/tcg-search instead of /api/search.
--
-- Safe to run more than once: "if not exists" skips a column (and its check)
-- that's already there.

alter table public.saved_searches
  add column if not exists side text not null default 'sports'
    check (side in ('sports', 'fables'));

alter table public.watched_listings
  add column if not exists side text not null default 'sports'
    check (side in ('sports', 'fables'));
