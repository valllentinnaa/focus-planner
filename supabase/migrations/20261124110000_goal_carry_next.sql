-- Habits marked with → on the 12W page are copied into the next 12-week cycle when it starts.
alter table public.goals add column if not exists carry_next boolean not null default false;
