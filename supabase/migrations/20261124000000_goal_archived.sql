-- Unfinished 12W goals are offered in the next cycle until they're brought in or let go.
-- `archived` marks a goal as handled, so it stops being offered (it stays as it was in its own cycle).
alter table public.goals add column if not exists archived boolean not null default false;
create index if not exists goals_open on public.goals (user_id, done, archived);
