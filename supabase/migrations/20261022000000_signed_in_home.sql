-- Signed-in home: "Since you were last here".
--
-- profiles.last_seen_at        when the member last opened the signed-in home.
--                               New alert matches are counted from here.
-- watched_listings.price_when_saved
--                               the price when the card was starred. The price
--                               column is refreshed in place, so without this
--                               we can't tell that a price dropped.
--
-- Safe to run more than once. The app works before this runs (the blocks
-- that need these columns just stay empty).

alter table public.profiles
  add column if not exists last_seen_at timestamptz;

alter table public.watched_listings
  add column if not exists price_when_saved numeric;

-- Existing stars: treat today's price as the saved price, so the first price
-- drop shown is a real drop from here on, never an invented one.
update public.watched_listings
  set price_when_saved = price
  where price_when_saved is null and price is not null;

-- No RLS or grant changes needed: both columns sit on tables the signed-in
-- user can already read and write, and the home summary route updates
-- last_seen_at server-side.
