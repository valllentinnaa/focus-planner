-- Which pages show in the main menu (the rest go under "More"). Week and Today are fixed.
alter table public.profiles
  add column if not exists menu_pages text[] not null default '{quarter}'
  check (menu_pages <@ array['month', 'quarter', 'food', 'presents']::text[]);
