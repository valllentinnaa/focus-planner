-- Voice notes on the Clipboard. A line can carry a recording (in a PRIVATE bucket, under a folder
-- named after the owner's user id) — text, voice, or both. Only the owner can upload, play (via
-- short-lived signed links) or delete their recordings.

alter table public.clipboard_items
  add column if not exists audio_path text,
  add column if not exists audio_seconds integer;

do $$ begin
  alter table public.clipboard_items add constraint clipboard_items_audio_valid check (
    (audio_path is null and audio_seconds is null)
    or (audio_path is not null
        and char_length(audio_path) <= 300
        and split_part(audio_path, '/', 1) = user_id::text
        and audio_seconds is not null
        and audio_seconds between 0 and 600));
exception when duplicate_object then null; end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clipboard-voice', 'clipboard-voice', false, 10485760,
        array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/x-m4a', 'audio/wav'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "clipboard-voice owner read" on storage.objects;
drop policy if exists "clipboard-voice owner delete" on storage.objects;
create policy "clipboard-voice owner read" on storage.objects for select to authenticated
  using (bucket_id = 'clipboard-voice' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "clipboard-voice owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'clipboard-voice' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Plans ──────────────────────────────────────────────────────────────────────────────
-- Which plan each user is on. Users can READ their own row but never write it: only the
-- server (service role — e.g. a future payments webhook) can. No row = free.
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  updated_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;
drop policy if exists "entitlements self select" on public.entitlements;
create policy "entitlements self select" on public.entitlements for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.entitlements from anon, authenticated;

-- How many voice notes a user may keep: 10 on free, 1000 on pro.
create or replace function public.voice_note_limit(uid uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select case when exists (select 1 from public.entitlements e where e.user_id = uid and e.plan = 'pro')
              then 1000 else 10 end;
$$;
revoke all on function public.voice_note_limit(uuid) from public, anon;
grant execute on function public.voice_note_limit(uuid) to authenticated;

-- Recordings already in the user's folder (counts files, so uploads can't sneak past the limit).
create or replace function public.clipboard_voice_files(uid uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int from storage.objects o
  where o.bucket_id = 'clipboard-voice' and (storage.foldername(o.name))[1] = uid::text;
$$;
revoke all on function public.clipboard_voice_files(uuid) from public, anon;
grant execute on function public.clipboard_voice_files(uuid) to authenticated;

-- Upload only into your own folder, and only while under your limit.
drop policy if exists "clipboard-voice owner upload" on storage.objects;
create policy "clipboard-voice owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'clipboard-voice'
              and (storage.foldername(name))[1] = auth.uid()::text
              and public.clipboard_voice_files(auth.uid()) < public.voice_note_limit(auth.uid()));

-- Same rule on the lines themselves. The per-user lock stops two saves at once from both
-- slipping in under the limit.
create or replace function public.clipboard_voice_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.audio_path is not null and (tg_op = 'INSERT' or old.audio_path is null) then
    perform pg_advisory_xact_lock(hashtextextended('clipboard-voice:' || new.user_id::text, 0));
    if (select count(*) from public.clipboard_items c where c.user_id = new.user_id and c.audio_path is not null)
       >= public.voice_note_limit(new.user_id) then
      raise exception 'voice_note_limit' using errcode = 'P0001', hint = 'Delete a voice note or upgrade to Pro.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists clipboard_voice_limit on public.clipboard_items;
create trigger clipboard_voice_limit before insert or update of audio_path on public.clipboard_items
  for each row execute function public.clipboard_voice_limit();
