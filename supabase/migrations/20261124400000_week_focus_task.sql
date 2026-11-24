-- The week's focus can be one of the week's tasks: tick either and both show done.
-- The composite key makes sure a week can only point at its owner's own task; deleting the task
-- just unlinks the focus (its text stays in weeks.focus).

create unique index if not exists tasks_id_user on public.tasks (id, user_id);

alter table public.weeks add column if not exists focus_task_id uuid;
do $$ begin
  alter table public.weeks
    add constraint weeks_focus_task_fk foreign key (focus_task_id, user_id)
    references public.tasks (id, user_id) on delete set null (focus_task_id);
exception when duplicate_object then null; end $$;
create index if not exists weeks_focus_task on public.weeks (focus_task_id) where focus_task_id is not null;
