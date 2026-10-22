-- Funnel tracking: anonymous usage events stored in our own database.
--
-- Paste into Supabase -> SQL Editor and run once.
--
-- Privacy: no emails, names, IPs or search text are ever stored. `meta` holds
-- only event names' small extras (e.g. which filter type was used). Writes go
-- through /api/track (service role); RLS is on with NO policies, so the anon
-- and signed-in browser keys can neither read nor write this table.

create table if not exists public.funnel_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  event       text not null,
  anon_id     text,                                   -- random id from the visitor's browser; null for server-side events
  user_id     uuid references auth.users (id) on delete set null,
  source      text,                                   -- where the visit/signup came from (star, alert, banner, direct, ...)
  path        text,                                   -- page path only, no query string
  meta        jsonb not null default '{}'::jsonb
);

create index if not exists funnel_events_event_created_idx
  on public.funnel_events (event, created_at desc);
create index if not exists funnel_events_user_event_idx
  on public.funnel_events (user_id, event) where user_id is not null;

alter table public.funnel_events enable row level security;
revoke all on public.funnel_events from anon, authenticated;
grant select, insert on public.funnel_events to service_role;

-- Counts per step for the admin funnel page. "people" = distinct visitors
-- (anon_id when present, otherwise the signed-in user for server-side events).
create or replace function public.funnel_summary(since timestamptz)
returns table (event text, events bigint, people bigint)
language sql
stable
security definer
set search_path = public
as $$
  select e.event,
         count(*)::bigint,
         count(distinct coalesce(e.anon_id, e.user_id::text))::bigint
  from public.funnel_events e
  where e.created_at >= since
  group by e.event;
$$;

revoke all on function public.funnel_summary(timestamptz) from public, anon, authenticated;
grant execute on function public.funnel_summary(timestamptz) to service_role;
