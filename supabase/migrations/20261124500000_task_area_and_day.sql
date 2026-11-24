-- A task can now live in a life area AND be scheduled to a day: it shows in both places (one row,
-- so ticking it anywhere ticks it everywhere). Drops the old "area or day, never both" rule.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.tasks'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%task_date IS NULL%area IS NULL%'
  loop
    execute format('alter table public.tasks drop constraint %I', c);
  end loop;
end $$;

-- Days are read by date; the week's area lists by week + area (existing indexes cover both).
