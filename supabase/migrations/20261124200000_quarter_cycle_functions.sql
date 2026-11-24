-- 12W cycle changes that touch several rows run as one transaction on the server, so a dropped
-- connection or a double click can never leave half-copied goals or duplicates behind.
-- All functions are SECURITY INVOKER: they run as the signed-in user, so row-level security still
-- applies to every row they read or write, and the current cycle is worked out server-side.

-- Where a copied goal came from (bring in / habit carried forward). Keeps the history across cycles.
alter table public.goals add column if not exists carried_from uuid references public.goals (id) on delete set null;
create index if not exists goals_carried_from on public.goals (carried_from) where carried_from is not null;

-- "Unfinished from before" reads only open, unhandled goals: a partial index keeps it small as
-- finished goals pile up over the years.
drop index if exists public.goals_open;
create index if not exists goals_leftovers on public.goals (user_id, area) where not done and not archived;

-- Copies a goal into a cycle, with its open project actions. Internal helper.
create or replace function public._copy_goal(p_goal public.goals, p_quarter uuid, p_position integer)
returns uuid language plpgsql security invoker set search_path = public as $$
declare v_id uuid;
begin
  insert into goals (quarter_id, area, text, is_project, carry_next, position, carried_from)
  values (p_quarter, p_goal.area, btrim(p_goal.text), p_goal.is_project, p_goal.carry_next, p_position, p_goal.id)
  returning id into v_id;
  if p_goal.is_project then
    insert into goal_steps (goal_id, text, position)
    select v_id, btrim(s.text), (row_number() over (order by s.position, s.created_at) - 1)::int
    from goal_steps s
    where s.goal_id = p_goal.id and not s.done and btrim(s.text) <> '';
  end if;
  return v_id;
end $$;

-- Starts the next 12W on p_start. Brings along the habits marked →, plus the unfinished goals
-- picked on the completion screen (p_carry). Unpicked ones stay under "Unfinished from before".
create or replace function public.start_next_quarter(p_start date, p_carry uuid[] default '{}')
returns public.quarters language plpgsql security invoker set search_path = public as $$
declare
  v_prev quarters;
  v_next quarters;
  v_goal goals;
begin
  select * into v_prev from quarters where user_id = auth.uid() order by start_date desc limit 1 for update;
  if v_prev.id is not null and p_start <= v_prev.start_date then
    raise exception 'The next cycle must start after %', v_prev.start_date using errcode = '22023';
  end if;
  insert into quarters (start_date) values (p_start) returning * into v_next;
  if v_prev.id is not null then
    for v_goal in
      select * from goals
      where quarter_id = v_prev.id and btrim(text) <> '' and not archived
        and ((area = 'habits' and carry_next) or (id = any(p_carry) and not done))
      order by area, position, created_at
      for update
    loop
      perform _copy_goal(
        v_goal, v_next.id,
        (select count(*)::int from goals where quarter_id = v_next.id and area = v_goal.area));
      update goals set archived = true where id = v_goal.id;
    end loop;
  end if;
  return v_next;
end $$;

-- Brings an unfinished goal from an earlier cycle into the current one. Every earlier copy of the
-- same goal (same area and text) is marked handled, so it's offered once.
create or replace function public.bring_in_goal(p_goal uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_goal goals;
  v_cur uuid;
  v_pos integer;
  v_id uuid;
begin
  select * into v_goal from goals where id = p_goal for update;
  if v_goal.id is null then raise exception 'Goal not found' using errcode = 'P0002'; end if;
  if v_goal.archived then raise exception 'Already brought in or let go' using errcode = '22023'; end if;
  select id into v_cur from quarters where user_id = auth.uid() order by start_date desc limit 1;
  if v_cur is null or v_goal.quarter_id = v_cur then
    raise exception 'Goal is already in the current cycle' using errcode = '22023';
  end if;
  select coalesce(max(position) + 1, 0) into v_pos from goals where quarter_id = v_cur and area = v_goal.area;
  v_id := _copy_goal(v_goal, v_cur, v_pos);
  update goals set archived = true
  where quarter_id <> v_cur and not done and not archived
    and area = v_goal.area and lower(btrim(text)) = lower(btrim(v_goal.text));
  return v_id;
end $$;

-- Lets an unfinished goal go: every earlier copy stops being offered; each stays as it was.
create or replace function public.let_go_goal(p_goal uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare v_goal goals;
begin
  select * into v_goal from goals where id = p_goal;
  if v_goal.id is null then raise exception 'Goal not found' using errcode = 'P0002'; end if;
  update goals set archived = true
  where user_id = auth.uid() and not done and not archived
    and area = v_goal.area and lower(btrim(text)) = lower(btrim(v_goal.text))
    and quarter_id <> coalesce((select id from quarters where user_id = auth.uid() order by start_date desc limit 1), v_goal.quarter_id);
end $$;

-- The helper runs as the caller (RLS applies), so signed-in users need execute on it too.
revoke all on function public._copy_goal(public.goals, uuid, integer) from public, anon;
grant execute on function public._copy_goal(public.goals, uuid, integer) to authenticated;
revoke all on function public.start_next_quarter(date, uuid[]) from public, anon;
revoke all on function public.bring_in_goal(uuid) from public, anon;
revoke all on function public.let_go_goal(uuid) from public, anon;
grant execute on function public.start_next_quarter(date, uuid[]) to authenticated;
grant execute on function public.bring_in_goal(uuid) to authenticated;
grant execute on function public.let_go_goal(uuid) to authenticated;
