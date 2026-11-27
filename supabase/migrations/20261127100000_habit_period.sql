-- "N times per week / month / 12 weeks": the period a times-based habit counts over.
-- habit_per_week holds N (1–7); habit_period says per what. Null period = per week.
alter table public.goals add column if not exists habit_period text;

do $$ begin
  alter table public.goals add constraint goals_habit_period_valid check (
    habit_period is null
    or (habit_period in ('week', 'month', 'cycle') and habit_per_week is not null));
exception when duplicate_object then null; end $$;

-- Carried into the next 12W with the rest of the schedule.
create or replace function public._copy_goal(p_goal public.goals, p_quarter uuid, p_position integer)
returns uuid language plpgsql security invoker set search_path = public as $$
declare v_id uuid;
begin
  insert into goals (quarter_id, area, text, is_project, carry_next, position, carried_from, habit_days, habit_per_week, habit_period)
  values (p_quarter, p_goal.area, btrim(p_goal.text), p_goal.is_project, p_goal.carry_next, p_position, p_goal.id,
          p_goal.habit_days, p_goal.habit_per_week, p_goal.habit_period)
  returning id into v_id;
  if p_goal.is_project then
    insert into goal_steps (goal_id, text, position)
    select v_id, btrim(s.text), (row_number() over (order by s.position, s.created_at) - 1)::int
    from goal_steps s
    where s.goal_id = p_goal.id and not s.done and btrim(s.text) <> '';
  end if;
  return v_id;
end $$;
