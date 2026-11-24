-- The focus of the day can be ticked done (like the week's).
alter table public.daily_entries add column if not exists focus_done boolean not null default false;
