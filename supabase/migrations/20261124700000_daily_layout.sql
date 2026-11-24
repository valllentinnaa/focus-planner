-- Daily journal settings: which sections show, plus your own fields (stored once per profile),
-- and the answers to your own fields per day. Both are small JSON objects with size limits.
alter table public.profiles add column if not exists daily_layout jsonb not null default '{}'::jsonb;
alter table public.daily_entries add column if not exists custom jsonb not null default '{}'::jsonb;

do $$ begin
  alter table public.profiles add constraint profiles_daily_layout_shape
    check (jsonb_typeof(daily_layout) = 'object' and octet_length(daily_layout::text) <= 8192);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.daily_entries add constraint daily_entries_custom_shape
    check (jsonb_typeof(custom) = 'object' and octet_length(custom::text) <= 32768);
exception when duplicate_object then null; end $$;
