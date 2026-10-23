-- Auction reminders: members pick any mix of times before an auction ends
-- (3 hours, 1 hour, 30, 15 or 5 minutes), each sent once, still only if the
-- bid is under their price (reminder_max_price) when they set one.
--
-- reminder_offsets  minutes before the end to remind, e.g. {180,15}
-- reminders_sent    which of those have already gone out
--
-- Existing reminders keep their old behaviour (about 3 hours before) via the
-- {180} default. Safe to run more than once.

alter table public.watched_listings
  add column if not exists reminder_offsets integer[] not null default '{180}',
  add column if not exists reminders_sent integer[] not null default '{}';

-- Reminders that already went out under the old one-shot system count as
-- sent, so nobody gets a repeat.
update public.watched_listings
  set reminders_sent = '{180}'
  where reminder_sent = true and reminders_sent = '{}';
