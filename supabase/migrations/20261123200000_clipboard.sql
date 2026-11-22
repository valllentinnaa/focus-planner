-- Clipboard: a quick-dump list of lines. A line can be flagged (shown in burgundy) and, once it
-- gets a date, it moves into the planner as a task on that day (and leaves the clipboard).
create table public.clipboard_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null default '' check (char_length(text) <= 500),
  attention boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clipboard_items_user on public.clipboard_items (user_id, position, created_at);
create trigger clipboard_items_updated_at before update on public.clipboard_items
  for each row execute function public.set_updated_at();

alter table public.clipboard_items enable row level security;
alter table public.clipboard_items force row level security;
create policy "clipboard_items owner select" on public.clipboard_items for select to authenticated using (user_id = auth.uid());
create policy "clipboard_items owner insert" on public.clipboard_items for insert to authenticated with check (user_id = auth.uid());
create policy "clipboard_items owner update" on public.clipboard_items for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "clipboard_items owner delete" on public.clipboard_items for delete to authenticated using (user_id = auth.uid());
revoke all on public.clipboard_items from anon;

-- On by default; "clipboard" in menu_pages means the + button in the header.
alter table public.profiles add column if not exists show_clipboard boolean not null default true;
alter table public.profiles drop constraint if exists profiles_menu_pages_check;
alter table public.profiles add constraint profiles_menu_pages_check
  check (menu_pages <@ array['month', 'quarter', 'food', 'presents', 'clipboard']::text[]);
alter table public.profiles alter column menu_pages set default '{quarter,clipboard}';
