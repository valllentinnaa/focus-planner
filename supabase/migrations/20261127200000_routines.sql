-- Repeating daily items that aren't 12W goals — for now Vitamins. Same "how often" as habits
-- (every day, or chosen weekdays; see goals.habit_days), set up and changed from Today, ticked per
-- day. Stopping one keeps its history (archived_at) instead of deleting it.

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('vitamin')),
  text text not null check (char_length(btrim(text)) between 1 and 200),
  habit_days smallint check (habit_days between 1 and 127),   -- Mon = 1 … Sun = 64; null = every day
  position integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists routines_id_user on public.routines (id, user_id);
create index if not exists routines_user_kind on public.routines (user_id, kind, position) where archived_at is null;
drop trigger if exists routines_updated_at on public.routines;
create trigger routines_updated_at before update on public.routines for each row execute function public.set_updated_at();

alter table public.routines enable row level security;
alter table public.routines force row level security;
drop policy if exists "routines owner select" on public.routines;
drop policy if exists "routines owner insert" on public.routines;
drop policy if exists "routines owner update" on public.routines;
drop policy if exists "routines owner delete" on public.routines;
create policy "routines owner select" on public.routines for select to authenticated using (user_id = auth.uid());
create policy "routines owner insert" on public.routines for insert to authenticated with check (user_id = auth.uid());
create policy "routines owner update" on public.routines for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "routines owner delete" on public.routines for delete to authenticated using (user_id = auth.uid());
revoke all on public.routines from anon;

-- Ticked on a day (one per routine per day).
create table if not exists public.routine_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  routine_id uuid not null,
  day date not null check (day >= date '2020-01-01'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routine_checks_routine_fk foreign key (routine_id, user_id) references public.routines (id, user_id) on delete cascade,
  constraint routine_checks_once_a_day unique (routine_id, day)
);
create index if not exists routine_checks_user_day on public.routine_checks (user_id, day);

alter table public.routine_checks enable row level security;
alter table public.routine_checks force row level security;
drop policy if exists "routine_checks owner select" on public.routine_checks;
drop policy if exists "routine_checks owner insert" on public.routine_checks;
drop policy if exists "routine_checks owner delete" on public.routine_checks;
create policy "routine_checks owner select" on public.routine_checks for select to authenticated using (user_id = auth.uid());
create policy "routine_checks owner insert" on public.routine_checks for insert to authenticated with check (user_id = auth.uid());
create policy "routine_checks owner delete" on public.routine_checks for delete to authenticated using (user_id = auth.uid());
revoke all on public.routine_checks from anon;
revoke update on public.routine_checks from authenticated;
