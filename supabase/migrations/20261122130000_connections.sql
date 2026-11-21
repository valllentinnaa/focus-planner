-- Share my profile — a personal link (and QR) that connects two people directly.
-- Opening someone's link and tapping Connect makes a two-way connection: you see each other's
-- wishlists, exactly like being in a circle together. Someone without the app signs up first
-- and is brought back to connect.

create table public.profile_links (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);
alter table public.profile_links enable row level security;
alter table public.profile_links force row level security;
create policy "profile_links owner select" on public.profile_links for select to authenticated using (user_id = auth.uid());
create policy "profile_links owner insert" on public.profile_links for insert to authenticated with check (user_id = auth.uid());
create policy "profile_links owner delete" on public.profile_links for delete to authenticated using (user_id = auth.uid());
revoke all on public.profile_links from anon;
revoke insert, update on public.profile_links from authenticated;
grant insert (user_id) on public.profile_links to authenticated;

-- One row per pair, smaller id first.
create table public.connections (
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index connections_b on public.connections (user_b);
alter table public.connections enable row level security;
alter table public.connections force row level security;
create policy "connections mine select" on public.connections for select to authenticated using (auth.uid() in (user_a, user_b));
create policy "connections mine delete" on public.connections for delete to authenticated using (auth.uid() in (user_a, user_b));
revoke all on public.connections from anon;
revoke insert, update on public.connections from authenticated;

-- Connected people count as "sharing a circle" for wishlists and claims.
create or replace function public.shares_circle_with(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_user <> auth.uid() and (
    exists (select 1 from circle_members a join circle_members b on a.circle_id = b.circle_id
            where a.user_id = auth.uid() and b.user_id = p_user)
    or exists (select 1 from connections
               where user_a = least(auth.uid(), p_user) and user_b = greatest(auth.uid(), p_user)));
$$;

/** Who's behind a profile link (shown to anyone holding it, so they know who invited them). */
create or replace function public.profile_preview(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'name', member_name(l.user_id),
    'is_me', l.user_id = auth.uid(),
    'connected', exists (select 1 from connections where user_a = least(auth.uid(), l.user_id) and user_b = greatest(auth.uid(), l.user_id)))
  from profile_links l where p_token ~ '^[0-9a-f]{32}$' and l.token = p_token;
$$;

create or replace function public.connect_with(p_token text)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare other uuid;
begin
  if auth.uid() is null or p_token !~ '^[0-9a-f]{32}$' then return false; end if;
  select user_id into other from profile_links where token = p_token;
  if other is null or other = auth.uid() then return false; end if;
  insert into connections (user_a, user_b) values (least(auth.uid(), other), greatest(auth.uid(), other)) on conflict do nothing;
  return true;
end $$;

create or replace function public.my_connections()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('user_id', o.id, 'name', member_name(o.id)) order by c.created_at), '[]'::jsonb)
  from connections c
  cross join lateral (select case when c.user_a = auth.uid() then c.user_b else c.user_a end as id) o
  where auth.uid() in (c.user_a, c.user_b);
$$;

revoke all on function public.profile_preview(text) from public;
revoke all on function public.connect_with(text) from public;
revoke all on function public.my_connections() from public;
grant execute on function public.profile_preview(text) to anon, authenticated;
grant execute on function public.connect_with(text) to authenticated;
grant execute on function public.my_connections() to authenticated;
