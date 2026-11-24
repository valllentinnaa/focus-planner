-- A cooking-list item can be planned for a day of its week. It then also shows in the cooking
-- schedule, that day's box on Week and the Daily journal — one row, so ticking it anywhere ticks it
-- everywhere.
alter table public.food_items add column if not exists cook_date date;

do $$ begin
  alter table public.food_items add constraint food_items_cook_date_valid
    check (cook_date is null or (list = 'cooking' and cook_date between week_start and week_start + 6));
exception when duplicate_object then null; end $$;

-- Day boxes and the journal read a day's planned meals by date.
create index if not exists food_items_cook_date on public.food_items (user_id, cook_date) where cook_date is not null;
