alter table public.profiles add column if not exists notify_frequency text not null default 'hourly', add column if not exists last_notified_at timestamptz;
