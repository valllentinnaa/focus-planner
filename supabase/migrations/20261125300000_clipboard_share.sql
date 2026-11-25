-- Share to Clipboard from the phone's Share menu (Android: the installed app; iPhone: a Shortcut).
-- A clipboard line can now carry an image (private bucket, owner folder). iPhone Shortcuts sign in
-- with a personal share key: only its SHA-256 is stored, it can only ADD clipboard lines (through
-- the share-in function), and the user can revoke it any time.

-- ── Images on clipboard lines ──────────────────────────────────────────────────────────
alter table public.clipboard_items add column if not exists image_path text;
do $$ begin
  alter table public.clipboard_items add constraint clipboard_items_image_valid check (
    image_path is null
    or (char_length(image_path) <= 300 and split_part(image_path, '/', 1) = user_id::text));
exception when duplicate_object then null; end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clipboard-images', 'clipboard-images', false, 8388608,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- How many images a user may keep: 50 on free, 2000 on pro (comped accounts count as pro).
create or replace function public.clipboard_image_limit(uid uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select case when exists (select 1 from public.entitlements e where e.user_id = uid and e.plan = 'pro')
              then 2000 else 50 end;
$$;
revoke all on function public.clipboard_image_limit(uuid) from public, anon;
grant execute on function public.clipboard_image_limit(uuid) to authenticated, service_role;

create or replace function public.clipboard_image_files(uid uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int from storage.objects o
  where o.bucket_id = 'clipboard-images' and (storage.foldername(o.name))[1] = uid::text;
$$;
revoke all on function public.clipboard_image_files(uuid) from public, anon;
grant execute on function public.clipboard_image_files(uuid) to authenticated, service_role;

drop policy if exists "clipboard-images owner read" on storage.objects;
drop policy if exists "clipboard-images owner upload" on storage.objects;
drop policy if exists "clipboard-images owner delete" on storage.objects;
create policy "clipboard-images owner read" on storage.objects for select to authenticated
  using (bucket_id = 'clipboard-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "clipboard-images owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'clipboard-images'
              and (storage.foldername(name))[1] = auth.uid()::text
              and public.clipboard_image_files(auth.uid()) < public.clipboard_image_limit(auth.uid()));
create policy "clipboard-images owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'clipboard-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Share keys (iPhone Shortcut) ───────────────────────────────────────────────────────
create table if not exists public.share_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,  -- one active key per user
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
alter table public.share_tokens enable row level security;
revoke all on public.share_tokens from anon, authenticated;
grant select (user_id, created_at, last_used_at) on public.share_tokens to authenticated;  -- never the hash
drop policy if exists "share_tokens self select" on public.share_tokens;
create policy "share_tokens self select" on public.share_tokens for select to authenticated using (user_id = auth.uid());

-- Make a new key (replacing any old one). The plain key is returned ONCE and never stored.
create or replace function public.create_share_token() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  token text;
begin
  if uid is null then raise exception 'not signed in' using errcode = '28000'; end if;
  token := 'fps_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.share_tokens (user_id, token_hash) values (uid, encode(sha256(convert_to(token, 'UTF8')), 'hex'))
  on conflict (user_id) do update set token_hash = excluded.token_hash, created_at = now(), last_used_at = null;
  return token;
end $$;
revoke all on function public.create_share_token() from public, anon;
grant execute on function public.create_share_token() to authenticated;

create or replace function public.revoke_share_token() returns void
language sql volatile security definer set search_path = '' as $$
  delete from public.share_tokens where user_id = auth.uid();
$$;
revoke all on function public.revoke_share_token() from public, anon;
grant execute on function public.revoke_share_token() to authenticated;
