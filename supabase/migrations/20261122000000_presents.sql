-- Presents — people you buy for (with birthdays) and gift ideas per person.
-- Owner-only RLS like every other table. Contacts imported from Google are stored only when the
-- user picks them; the full contact list is never stored.

create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  -- Birthday as month/day (+ optional year): many contacts have no birth year.
  birth_month smallint check (birth_month between 1 and 12),
  birth_day smallint check (birth_day between 1 and 31),
  birth_year smallint check (birth_year between 1900 and 2100),
  notes text not null default '' check (char_length(notes) <= 2000),
  -- 'manual' | 'google'. external_id = Google People resourceName, so re-imports don't duplicate.
  source text not null default 'manual' check (source in ('manual', 'google', 'device', 'file')),
  external_id text check (char_length(external_id) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((birth_month is null) = (birth_day is null)),
  check (birth_year is null or birth_month is not null)
);
create index people_user on public.people (user_id, birth_month, birth_day);
create unique index people_user_external on public.people (user_id, source, external_id) where external_id is not null;
create trigger people_updated_at before update on public.people
  for each row execute function public.set_updated_at();

create table public.gift_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 1000),
  link text check (link is null or (char_length(link) <= 2000 and link ~* '^https?://')),
  status text not null default 'idea' check (status in ('idea', 'bought', 'given')),
  -- Year it was given, so next year you can see what they already got.
  given_year smallint check (given_year between 1900 and 2100),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index gift_ideas_person on public.gift_ideas (user_id, person_id, position);
create trigger gift_ideas_updated_at before update on public.gift_ideas
  for each row execute function public.set_updated_at();

-- A gift idea can only point at one of your own people.
create or replace function public.gift_ideas_check_owner()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if not exists (select 1 from public.people p where p.id = new.person_id and p.user_id = new.user_id) then
    raise exception 'person not found';
  end if;
  return new;
end $$;
create trigger gift_ideas_owner before insert or update of person_id, user_id on public.gift_ideas
  for each row execute function public.gift_ideas_check_owner();

do $$
declare t text;
begin
  foreach t in array array['people','gift_ideas']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('create policy "%1$s owner select" on public.%1$I for select to authenticated using (user_id = auth.uid())', t);
    execute format('create policy "%1$s owner insert" on public.%1$I for insert to authenticated with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s owner update" on public.%1$I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s owner delete" on public.%1$I for delete to authenticated using (user_id = auth.uid())', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- Settings toggle for the Presents tab (on by default).
alter table public.profiles add column show_presents boolean not null default true;
