-- A task that was the day's focus and got finished. Today shows these crossed out in the focus
-- box (above the current focus), instead of down in "Your day".
alter table public.tasks add column if not exists was_focus boolean not null default false;
