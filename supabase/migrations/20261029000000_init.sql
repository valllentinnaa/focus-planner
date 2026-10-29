-- Focus Planner — initial schema.
-- Every user-owned table carries user_id (default auth.uid()) and is locked by RLS to that user.
-- Nothing is readable by anon; the service role is never used from the client.
--
-- Tasks are unified: one `tasks` table backs the Week life-area lists, the Week day boxes,
-- the Daily journal and the Month view. A task is EITHER filed under a life area for a week
-- (area set, task_date null) OR scheduled to a day (task_date set, area null). A day-scheduled
-- task therefore shows in the Week day box, that day's Daily journal and the Month view at once.

create extension if not exists "pgcrypto";

-- ---------- helpers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- profiles (1:1 with auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  show_daily boolean not null default false,
  show_food boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- weeks (the per-week text fields; items live in `tasks`) ----------
create table public.weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start date not null,
  focus text not null default '',
  notes text not null default '',
  prompt_dismissed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start),
  check (extract(isodow from week_start) = 1)
);
create trigger weeks_updated_at before update on public.weeks
  for each row execute function public.set_updated_at();

-- ---------- daily entries (the journal text + per-day focus; tasks live in `tasks`) ----------
create table public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entry_date date not null,
  gratitude text not null default '',
  focus text not null default '',
  notes text not null default '',
  day_start text not null default '',
  sleep text not null default '',
  practices text not null default '',
  vitamins text not null default '',
  screen_time text not null default '',
  steps text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);
create trigger daily_entries_updated_at before update on public.daily_entries
  for each row execute function public.set_updated_at();

-- ---------- tasks (unified across Week areas, day boxes, Daily and Month) ----------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null default '' check (char_length(text) <= 500),
  done boolean not null default false,
  -- Owning week (Monday). For a day-scheduled task this is the Monday of task_date.
  week_start date not null,
  -- Life area when filed in a Week column; null when scheduled to a day or a loose week item.
  area text check (area is null or area in ('personal', 'work', 'development')),
  -- When set, the task is scheduled to this day (shows in day box + Daily + Month).
  task_date date,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (extract(isodow from week_start) = 1),
  -- A task is either in a life area (undated) or scheduled to a day — never both.
  check (task_date is null or area is null)
);
create index tasks_user_week on public.tasks (user_id, week_start);
create index tasks_user_date on public.tasks (user_id, task_date);
create index tasks_user_area on public.tasks (user_id, week_start, area, position);
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------- food (per week) ----------
create table public.food_weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start date not null,
  notes text not null default '',
  schedule jsonb not null default '["","","","","","",""]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start),
  check (extract(isodow from week_start) = 1),
  check (jsonb_typeof(schedule) = 'array' and jsonb_array_length(schedule) = 7)
);
create trigger food_weeks_updated_at before update on public.food_weeks
  for each row execute function public.set_updated_at();

create table public.food_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start date not null,
  list text not null check (list in ('shopping', 'cooking')),
  text text not null check (char_length(text) between 1 and 300),
  done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index food_items_user_week on public.food_items (user_id, week_start, list, position);
create trigger food_items_updated_at before update on public.food_items
  for each row execute function public.set_updated_at();

-- ---------- 12-week quarter ----------
create table public.quarters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  start_date date not null,
  theme text not null default '' check (char_length(theme) <= 200),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, start_date)
);
create trigger quarters_updated_at before update on public.quarters
  for each row execute function public.set_updated_at();

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quarter_id uuid not null references public.quarters (id) on delete cascade,
  area text not null check (area in ('personal', 'work', 'development', 'habits')),
  text text not null default '' check (char_length(text) <= 500),
  done boolean not null default false,
  is_project boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index goals_quarter on public.goals (user_id, quarter_id, area, position);
create trigger goals_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

create table public.goal_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  text text not null default '' check (char_length(text) <= 500),
  done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index goal_steps_goal on public.goal_steps (user_id, goal_id, position);
create trigger goal_steps_updated_at before update on public.goal_steps
  for each row execute function public.set_updated_at();

-- ---------- RLS ----------
-- Pattern: owner-only on every table. user_id is set by default and cannot be changed to another user.
do $$
declare t text;
begin
  foreach t in array array['weeks','daily_entries','tasks','food_weeks','food_items','quarters','goals','goal_steps']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('create policy "%1$s owner select" on public.%1$I for select to authenticated using (user_id = auth.uid())', t);
    execute format('create policy "%1$s owner insert" on public.%1$I for insert to authenticated with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s owner update" on public.%1$I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s owner delete" on public.%1$I for delete to authenticated using (user_id = auth.uid())', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
create policy "profiles self select" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles self update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- No insert/delete policy on profiles: rows are created by trigger and removed with the auth user.

-- Nothing for anon at all.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
