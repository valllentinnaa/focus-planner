-- Life-area colours on Today (Work life, Personal life, Personal development).
-- Stored as swatch names, not hex, so each swatch has its own light and dark shade and the
-- palette can be retuned later without touching anyone's data. Off by default.

create or replace function public.valid_area_colors(c jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(c) = 'object'
     and not exists (
       select 1
       from jsonb_each(c) as e(key, value)
       where e.key not in ('personal', 'work', 'development')
          or jsonb_typeof(e.value) <> 'string'
          or (e.value #>> '{}') not in ('sage', 'sky', 'rose', 'amber', 'lavender', 'terracotta', 'slate')
     );
$$;

alter table public.profiles add column if not exists area_colors jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists show_area_colors boolean not null default false;

alter table public.profiles drop constraint if exists profiles_area_colors_valid;
alter table public.profiles add constraint profiles_area_colors_valid check (public.valid_area_colors(area_colors));
