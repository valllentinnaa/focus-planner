-- "N times a week" habits are planned on the Week page: placing one on a day creates a task that
-- belongs to the habit (tasks.habit_id). Ticking that task counts for the habit (a habit_checks
-- row for that day), so progress stays in one place however you tick it.

alter table public.tasks add column if not exists habit_id uuid;

-- Only your own habit, and the task survives if the habit is deleted (it just stops counting).
do $$ begin
  alter table public.tasks add constraint tasks_habit_fk foreign key (habit_id, user_id)
    references public.goals (id, user_id) on delete set null (habit_id);
exception when duplicate_object then null; end $$;

-- "How many of this habit are planned this week?"
create index if not exists tasks_habit_week on public.tasks (user_id, habit_id, week_start) where habit_id is not null;

-- Keep habit_checks in step with the habit's tasks: a done task on a day = checked that day.
create or replace function public.sync_habit_check() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  -- Un-count the old day, unless another done task of the same habit is still on it.
  if tg_op in ('UPDATE', 'DELETE') and old.habit_id is not null and old.task_date is not null and old.done then
    if not exists (
      select 1 from tasks t
      where t.habit_id = old.habit_id and t.task_date = old.task_date and t.done and t.id <> old.id
    ) then
      delete from habit_checks where goal_id = old.habit_id and day = old.task_date;
    end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.habit_id is not null and new.task_date is not null and new.done then
    insert into habit_checks (goal_id, day, user_id) values (new.habit_id, new.task_date, new.user_id)
    on conflict (goal_id, day) do nothing;
  end if;
  return null;
end $$;

drop trigger if exists tasks_sync_habit_check on public.tasks;
create trigger tasks_sync_habit_check
  after insert or delete or update of done, task_date, habit_id on public.tasks
  for each row execute function public.sync_habit_check();
