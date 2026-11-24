-- A typed focus that isn't one of the week's tasks can be ticked done too.
-- (A linked focus follows its task's done state instead.)
alter table public.weeks add column if not exists focus_done boolean not null default false;
