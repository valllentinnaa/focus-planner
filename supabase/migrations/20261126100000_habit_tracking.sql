-- Habits: how often (every day, chosen weekdays, or N times a week) and a check-off per day, so
-- Today can list the habits that are due and the 12W page can show progress.
--
-- goals.habit_days     — chosen weekdays as a bitmask, Mon = 1, Tue = 2, Wed = 4 … Sun = 64.
-- goals.habit_per_week — "N times a week", any days.
-- Both null = every day. At most one is set. Only habits use them.

alter table public.goals
  add column if not exists habit_days smallint,
  add column if not exists habit_per_week smallint;

do $$ begin
  alter table public.goals add constraint goals_habit_schedule_valid check (
    (habit_days is null or habit_days between 1 and 127)
    and (habit_per_week is null or habit_per_week between 1 and 7)
    and (habit_days is null or habit_per_week is null)
    and (area = 'habits' or (habit_days is null and habit_per_week is null)));
exception when duplicate_object then null; end $$;

-- Lets check-offs reference (goal, owner) together, so a check can only point at your own habit.
create unique index if not exists goals_id_user on public.goals (id, user_id);

create table if not exists public.habit_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid not null,
  day date not null check (day >= date '2020-01-01'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habit_checks_goal_fk foreign key (goal_id, user_id) references public.goals (id, user_id) on delete cascade,
  constraint habit_checks_once_a_day unique (goal_id, day)
);
-- Today / a week: everything checked in a date range. (Per-habit lookups use the unique index.)
create index if not exists habit_checks_user_day on public.habit_checks (user_id, day);

alter table public.habit_checks enable row level security;
alter table public.habit_checks force row level security;
drop policy if exists "habit_checks owner select" on public.habit_checks;
drop policy if exists "habit_checks owner insert" on public.habit_checks;
drop policy if exists "habit_checks owner delete" on public.habit_checks;
create policy "habit_checks owner select" on public.habit_checks for select to authenticated using (user_id = auth.uid());
create policy "habit_checks owner insert" on public.habit_checks for insert to authenticated with check (user_id = auth.uid());
create policy "habit_checks owner delete" on public.habit_checks for delete to authenticated using (user_id = auth.uid());
revoke all on public.habit_checks from anon;
revoke update on public.habit_checks from authenticated;  -- a check is added or removed, never edited

-- Only habits can be checked off.
create or replace function public.habit_checks_only_habits() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if not exists (select 1 from goals g where g.id = new.goal_id and g.area = 'habits') then
    raise exception 'Only habits can be checked off' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists habit_checks_only_habits on public.habit_checks;
create trigger habit_checks_only_habits before insert on public.habit_checks
  for each row execute function public.habit_checks_only_habits();

-- A habit carried into the next 12W keeps how often it's meant to happen.
create or replace function public._copy_goal(p_goal public.goals, p_quarter uuid, p_position integer)
returns uuid language plpgsql security invoker set search_path = public as $$
declare v_id uuid;
begin
  insert into goals (quarter_id, area, text, is_project, carry_next, position, carried_from, habit_days, habit_per_week)
  values (p_quarter, p_goal.area, btrim(p_goal.text), p_goal.is_project, p_goal.carry_next, p_position, p_goal.id,
          p_goal.habit_days, p_goal.habit_per_week)
  returning id into v_id;
  if p_goal.is_project then
    insert into goal_steps (goal_id, text, position)
    select v_id, btrim(s.text), (row_number() over (order by s.position, s.created_at) - 1)::int
    from goal_steps s
    where s.goal_id = p_goal.id and not s.done and btrim(s.text) <> '';
  end if;
  return v_id;
end $$;
