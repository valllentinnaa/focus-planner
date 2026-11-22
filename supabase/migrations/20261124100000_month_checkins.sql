-- Monthly check-in: a short look back at the month (what went well, what felt heavy, one thing to
-- try next), typed or as voice notes, then a look ahead.
--
-- month_checkins       one row per (user, month). PRIVATE BY DEFAULT: share_fields is empty
--                      until the owner picks which answers their people may see.
-- checkin_cheers       a 🥂 from a friend on a shared check-in. No comments.
-- checkin_meetups      "Do it together": a date + place or video link, for one circle or for
--                      everyone you're connected with. RSVPs in checkin_meetup_rsvps.
-- checkin-voice bucket PRIVATE. Files sit under <owner id>/…; the owner reads/writes them, and a
--                      friend can read one only while its answer is shared with them.
-- "Your people" = anyone you share a circle or a connection with (shares_circle_with).

create table public.month_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  went_well text not null default '' check (char_length(went_well) <= 2000),
  felt_heavy text not null default '' check (char_length(felt_heavy) <= 2000),
  try_next text not null default '' check (char_length(try_next) <= 500),
  went_well_audio text check (went_well_audio is null or char_length(went_well_audio) <= 300),
  felt_heavy_audio text check (felt_heavy_audio is null or char_length(felt_heavy_audio) <= 300),
  try_next_audio text check (try_next_audio is null or char_length(try_next_audio) <= 300),
  share_fields text[] not null default '{}' check (share_fields <@ array['went_well', 'felt_heavy', 'try_next']),
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month),
  -- Voice notes must live in the owner's own folder.
  check (went_well_audio is null or split_part(went_well_audio, '/', 1) = user_id::text),
  check (felt_heavy_audio is null or split_part(felt_heavy_audio, '/', 1) = user_id::text),
  check (try_next_audio is null or split_part(try_next_audio, '/', 1) = user_id::text)
);
create trigger month_checkins_updated_at before update on public.month_checkins
  for each row execute function public.set_updated_at();

alter table public.month_checkins enable row level security;
alter table public.month_checkins force row level security;
-- The table itself is owner-only. Friends see shared answers through mates_checkins() only.
create policy "month_checkins owner select" on public.month_checkins for select to authenticated using (user_id = auth.uid());
create policy "month_checkins owner insert" on public.month_checkins for insert to authenticated with check (user_id = auth.uid());
create policy "month_checkins owner update" on public.month_checkins for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "month_checkins owner delete" on public.month_checkins for delete to authenticated using (user_id = auth.uid());
revoke all on public.month_checkins from anon;

create table public.checkin_cheers (
  checkin_id uuid not null references public.month_checkins (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (checkin_id, user_id)
);
alter table public.checkin_cheers enable row level security;
alter table public.checkin_cheers force row level security;
-- Written and read only through the functions below.
revoke all on public.checkin_cheers from anon, authenticated;

create table public.checkin_meetups (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  circle_id uuid references public.circles (id) on delete cascade,
  starts_at timestamptz not null,
  place text not null default '' check (char_length(place) <= 200),
  link text check (link is null or (char_length(link) <= 500 and link ~* '^https?://')),
  created_at timestamptz not null default now()
);
create index checkin_meetups_host on public.checkin_meetups (host_id, starts_at);
create index checkin_meetups_circle on public.checkin_meetups (circle_id, starts_at);
alter table public.checkin_meetups enable row level security;
alter table public.checkin_meetups force row level security;
create policy "checkin_meetups host insert" on public.checkin_meetups for insert to authenticated
  with check (host_id = auth.uid() and (circle_id is null or public.is_circle_member(circle_id)));
create policy "checkin_meetups host delete" on public.checkin_meetups for delete to authenticated using (host_id = auth.uid());
revoke all on public.checkin_meetups from anon;
revoke select, update on public.checkin_meetups from authenticated;

create table public.checkin_meetup_rsvps (
  meetup_id uuid not null references public.checkin_meetups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meetup_id, user_id)
);
alter table public.checkin_meetup_rsvps enable row level security;
alter table public.checkin_meetup_rsvps force row level security;
revoke all on public.checkin_meetup_rsvps from anon, authenticated;

-- ---------- helpers ----------
/** Whether the caller may see a meetup: the host, a member of its circle, or (no circle) one of the host's people. */
create or replace function public.can_see_meetup(p_meetup uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from checkin_meetups m where m.id = p_meetup and (
      m.host_id = auth.uid()
      or (m.circle_id is not null and is_circle_member(m.circle_id))
      or (m.circle_id is null and shares_circle_with(m.host_id))));
$$;

/** Whether the caller may hear a voice note: it's theirs, or its answer is shared with them. */
create or replace function public.can_hear_voice(p_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select split_part(p_path, '/', 1) = auth.uid()::text or exists (
    select 1 from month_checkins c
    where c.user_id::text = split_part(p_path, '/', 1)
      and shares_circle_with(c.user_id)
      and ((c.went_well_audio = p_path and 'went_well' = any(c.share_fields))
        or (c.felt_heavy_audio = p_path and 'felt_heavy' = any(c.share_fields))
        or (c.try_next_audio = p_path and 'try_next' = any(c.share_fields))));
$$;
revoke all on function public.can_see_meetup(uuid) from public;
revoke all on function public.can_hear_voice(text) from public;
grant execute on function public.can_see_meetup(uuid) to authenticated;
grant execute on function public.can_hear_voice(text) to authenticated;

-- ---------- voice notes ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('checkin-voice', 'checkin-voice', false, 10485760,
        array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/x-m4a', 'audio/wav'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "checkin-voice read" on storage.objects for select to authenticated
  using (bucket_id = 'checkin-voice' and public.can_hear_voice(name));
create policy "checkin-voice owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'checkin-voice' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "checkin-voice owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'checkin-voice' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- functions ----------
/**
 * Your people's check-ins for a month — only the answers they chose to share, and only once they
 * finished. Unshared check-ins don't appear at all (not even that they exist).
 */
create or replace function public.mates_checkins(p_month date)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'user_id', c.user_id,
    'name', member_name(c.user_id),
    'went_well', case when 'went_well' = any(c.share_fields) then c.went_well end,
    'felt_heavy', case when 'felt_heavy' = any(c.share_fields) then c.felt_heavy end,
    'try_next', case when 'try_next' = any(c.share_fields) then c.try_next end,
    'went_well_audio', case when 'went_well' = any(c.share_fields) then c.went_well_audio end,
    'felt_heavy_audio', case when 'felt_heavy' = any(c.share_fields) then c.felt_heavy_audio end,
    'try_next_audio', case when 'try_next' = any(c.share_fields) then c.try_next_audio end,
    'cheers', (select count(*) from checkin_cheers h where h.checkin_id = c.id),
    'cheered', exists (select 1 from checkin_cheers h where h.checkin_id = c.id and h.user_id = auth.uid())
  ) order by c.done_at desc), '[]'::jsonb)
  from month_checkins c
  where c.month = p_month and c.done_at is not null and cardinality(c.share_fields) > 0 and shares_circle_with(c.user_id);
$$;

/** Who cheered your own check-in. */
create or replace function public.my_checkin_cheers(p_month date)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(member_name(h.user_id) order by h.created_at), '[]'::jsonb)
  from month_checkins c join checkin_cheers h on h.checkin_id = c.id
  where c.user_id = auth.uid() and c.month = p_month;
$$;

/** 🥂 on a friend's shared check-in (toggle). Returns whether you're cheering now. */
create or replace function public.toggle_checkin_cheer(p_checkin uuid)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare owner uuid;
begin
  select user_id into owner from month_checkins
  where id = p_checkin and done_at is not null and cardinality(share_fields) > 0;
  if owner is null or not shares_circle_with(owner) then return false; end if;
  delete from checkin_cheers where checkin_id = p_checkin and user_id = auth.uid();
  if found then return false; end if;
  insert into checkin_cheers (checkin_id, user_id) values (p_checkin, auth.uid());
  return true;
end $$;

/** Upcoming "do it together" meetups you can see (from yesterday on), with who's in. */
create or replace function public.upcoming_meetups()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id,
    'host', member_name(m.host_id),
    'is_host', m.host_id = auth.uid(),
    'circle', (select name from circles where id = m.circle_id),
    'starts_at', m.starts_at,
    'place', m.place,
    'link', m.link,
    'going', (select coalesce(jsonb_agg(member_name(r.user_id) order by r.created_at), '[]'::jsonb) from checkin_meetup_rsvps r where r.meetup_id = m.id),
    'me_going', exists (select 1 from checkin_meetup_rsvps r where r.meetup_id = m.id and r.user_id = auth.uid())
  ) order by m.starts_at), '[]'::jsonb)
  from checkin_meetups m
  where m.starts_at > now() - interval '1 day' and can_see_meetup(m.id);
$$;

/** "I'm in" (toggle). The host is always in. */
create or replace function public.toggle_meetup_rsvp(p_meetup uuid)
returns boolean language plpgsql volatile security definer set search_path = public as $$
begin
  if not can_see_meetup(p_meetup) then return false; end if;
  delete from checkin_meetup_rsvps where meetup_id = p_meetup and user_id = auth.uid();
  if found then return false; end if;
  insert into checkin_meetup_rsvps (meetup_id, user_id) values (p_meetup, auth.uid());
  return true;
end $$;

create or replace function public.checkin_meetups_add_host()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into checkin_meetup_rsvps (meetup_id, user_id) values (new.id, new.host_id) on conflict do nothing;
  return new;
end $$;
create trigger checkin_meetups_add_host after insert on public.checkin_meetups
  for each row execute function public.checkin_meetups_add_host();

do $$
declare f text;
begin
  foreach f in array array['mates_checkins(date)', 'my_checkin_cheers(date)', 'toggle_checkin_cheer(uuid)',
                           'upcoming_meetups()', 'toggle_meetup_rsvp(uuid)']
  loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
