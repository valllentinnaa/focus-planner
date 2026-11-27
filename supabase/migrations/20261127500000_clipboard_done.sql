-- Tick a clipboard line off like any item. A time, not a flag, so "done today" vs older can be
-- told apart later (e.g. tidying old ticked lines) without another migration.
alter table public.clipboard_items add column if not exists done_at timestamptz;
