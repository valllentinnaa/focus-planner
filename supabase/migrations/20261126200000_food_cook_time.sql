-- A cooking item planned for a day can have a time too ("19:00 боб с тиква"), so it sits in the
-- day by the clock among tasks and events. Like tasks: only an item on a day can have a time.
alter table public.food_items add column if not exists cook_time time;

do $$ begin
  alter table public.food_items add constraint food_items_time_needs_day check (cook_time is null or cook_date is not null);
exception when duplicate_object then null; end $$;
