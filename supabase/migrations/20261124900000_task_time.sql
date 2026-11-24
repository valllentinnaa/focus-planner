-- A task on a day can have a time (typed as "13:00" in the text, or set with the clock).
-- It orders the day among calendar events. Only a task on a day can have a time.
alter table public.tasks add column if not exists task_time time;

do $$ begin
  alter table public.tasks add constraint tasks_time_needs_day check (task_time is null or task_date is not null);
exception when duplicate_object then null; end $$;
