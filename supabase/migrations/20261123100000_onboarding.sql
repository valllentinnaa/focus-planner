-- Onboarding: optional gender, and whether the first-run setup has been done.
-- Today is on by default from now on (Today, Week and 12W are the core of the planner).
alter table public.profiles
  add column if not exists gender text
    check (gender is null or gender in ('woman', 'man', 'undisclosed')),
  add column if not exists onboarded_at timestamptz;

alter table public.profiles alter column show_daily set default true;

-- Existing accounts have already set things up; don't send them through onboarding.
update public.profiles set onboarded_at = coalesce(onboarded_at, now());
