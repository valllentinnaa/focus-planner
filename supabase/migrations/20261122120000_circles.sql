-- Circles — small groups (family, friends) of app users who can see each other's wishlists.
--
-- circles          name + private invite token (128 random bits). The creator owns it.
-- circle_members   who's in. Rows are only written through join_circle / leave / remove.
-- Members see each other's wishlist through circle_wishlist(), and mark "I'm getting this"
-- through circle_claim(); the list owner never sees claims (wishlist_claims stays unreadable).
-- people.linked_user_id ties one of your contacts to a circle member, so their wishlist shows
-- on that person in Presents.

create table public.circles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  invite_token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);

create table public.circle_members (
  circle_id uuid not null references public.circles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);
create index circle_members_user on public.circle_members (user_id);

-- Helper used by policies (definer, so policies on circle_members don't recurse).
create or replace function public.is_circle_member(p_circle uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from circle_members where circle_id = p_circle and user_id = auth.uid());
$$;
create or replace function public.shares_circle_with(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from circle_members a join circle_members b on a.circle_id = b.circle_id
    where a.user_id = auth.uid() and b.user_id = p_user and p_user <> auth.uid());
$$;
revoke all on function public.is_circle_member(uuid) from public;
revoke all on function public.shares_circle_with(uuid) from public;
grant execute on function public.is_circle_member(uuid) to authenticated;
grant execute on function public.shares_circle_with(uuid) to authenticated;

alter table public.circles enable row level security;
alter table public.circles force row level security;
create policy "circles member select" on public.circles for select to authenticated using (public.is_circle_member(id));
create policy "circles owner insert" on public.circles for insert to authenticated with check (owner_id = auth.uid());
create policy "circles owner update" on public.circles for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "circles owner delete" on public.circles for delete to authenticated using (owner_id = auth.uid());
revoke all on public.circles from anon;
revoke update on public.circles from authenticated;
grant update (name) on public.circles to authenticated;
-- The invite token is visible only to the owner (members get circles through my_circles()).
revoke select on public.circles from authenticated;
grant select (id, owner_id, name, created_at) on public.circles to authenticated;

alter table public.circle_members enable row level security;
alter table public.circle_members force row level security;
create policy "circle_members member select" on public.circle_members for select to authenticated using (public.is_circle_member(circle_id));
-- Leave yourself, or the owner removes someone.
create policy "circle_members leave or remove" on public.circle_members for delete to authenticated
  using (user_id = auth.uid() or exists (select 1 from circles c where c.id = circle_id and c.owner_id = auth.uid()));
revoke all on public.circle_members from anon;
revoke insert, update on public.circle_members from authenticated;

-- The creator is a member of their own circle.
create or replace function public.circles_add_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into circle_members (circle_id, user_id) values (new.id, new.owner_id) on conflict do nothing;
  return new;
end $$;
create trigger circles_add_owner after insert on public.circles for each row execute function public.circles_add_owner();

-- Contacts linked to a circle member.
alter table public.people add column linked_user_id uuid references auth.users (id) on delete set null;
create index people_linked on public.people (user_id, linked_user_id);

-- Claims can now come from circle members too (claimed_by) — still unreadable to everyone.
alter table public.wishlist_claims add column claimed_by uuid references auth.users (id) on delete cascade;
alter table public.wishlist_claims alter column claim_key_hash drop not null;
alter table public.wishlist_claims add constraint wishlist_claims_who check (claim_key_hash is not null or claimed_by is not null);

-- ---------- functions ----------
create or replace function public.member_name(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(p.display_name), ''), split_part(u.email, '@', 1), 'Someone')
  from auth.users u left join profiles p on p.id = u.id where u.id = p_user;
$$;
revoke all on function public.member_name(uuid) from public;

/** Your circles with members; the invite token only for circles you own. */
create or replace function public.my_circles()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'name', c.name, 'is_owner', c.owner_id = auth.uid(),
    'invite_token', case when c.owner_id = auth.uid() then c.invite_token end,
    'members', (select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'name', member_name(m.user_id), 'is_me', m.user_id = auth.uid(), 'is_owner', m.user_id = c.owner_id) order by m.joined_at)
                from circle_members m where m.circle_id = c.id)
  ) order by c.created_at), '[]'::jsonb)
  from circles c where exists (select 1 from circle_members m where m.circle_id = c.id and m.user_id = auth.uid());
$$;

/** What the join page shows before joining. */
create or replace function public.circle_preview(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('name', c.name, 'owner', member_name(c.owner_id), 'members', (select count(*) from circle_members m where m.circle_id = c.id),
                            'already', exists (select 1 from circle_members m where m.circle_id = c.id and m.user_id = auth.uid()))
  from circles c where p_token ~ '^[0-9a-f]{32}$' and c.invite_token = p_token;
$$;

create or replace function public.join_circle(p_token text)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null or p_token !~ '^[0-9a-f]{32}$' then return null; end if;
  select id into cid from circles where invite_token = p_token;
  if cid is null then return null; end if;
  if (select count(*) from circle_members where circle_id = cid) >= 50 then raise exception 'circle is full'; end if;
  insert into circle_members (circle_id, user_id) values (cid, auth.uid()) on conflict do nothing;
  return cid;
end $$;

/** Owner: make a new invite link (the old one stops working). */
create or replace function public.reset_circle_invite(p_circle uuid)
returns text language plpgsql volatile security definer set search_path = public as $$
declare t text := encode(extensions.gen_random_bytes(16), 'hex');
begin
  update circles set invite_token = t where id = p_circle and owner_id = auth.uid();
  if not found then return null; end if;
  return t;
end $$;

/** A circle-mate's wishlist, with whether each item is claimed (and by you). */
create or replace function public.circle_wishlist(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not shares_circle_with(p_user) then return null; end if;
  return jsonb_build_object('name', member_name(p_user), 'items', coalesce((
    select jsonb_agg(jsonb_build_object('id', i.id, 'text', i.text, 'link', i.link, 'note', i.note,
             'claimed', c.item_id is not null, 'mine', c.claimed_by = auth.uid()) order by i.position, i.created_at)
    from wishlist_items i left join wishlist_claims c on c.item_id = i.id
    where i.user_id = p_user), '[]'::jsonb));
end $$;

create or replace function public.circle_claim(p_item uuid)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare owner uuid;
begin
  select user_id into owner from wishlist_items where id = p_item;
  if owner is null or not shares_circle_with(owner) then return false; end if;
  insert into wishlist_claims (item_id, claimed_by) values (p_item, auth.uid()) on conflict (item_id) do nothing;
  return found;
end $$;

create or replace function public.circle_unclaim(p_item uuid)
returns boolean language plpgsql volatile security definer set search_path = public as $$
begin
  delete from wishlist_claims where item_id = p_item and claimed_by = auth.uid();
  return found;
end $$;

do $$
declare f text;
begin
  foreach f in array array['my_circles()', 'circle_preview(text)', 'join_circle(text)', 'reset_circle_invite(uuid)',
                           'circle_wishlist(uuid)', 'circle_claim(uuid)', 'circle_unclaim(uuid)']
  loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
