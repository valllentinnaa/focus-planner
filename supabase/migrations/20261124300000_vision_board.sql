-- A small vision board for each 12W cycle: images and short words.
-- Images live in a PRIVATE bucket under a folder named after the owner's user id; only the owner
-- can upload, read (via short-lived signed URLs) or delete them. Images are downscaled in the app
-- before upload (max 1600 px) to keep storage and loading small.

create table if not exists public.vision_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quarter_id uuid not null references public.quarters (id) on delete cascade,
  kind text not null check (kind in ('image', 'text')),
  file_path text check (file_path is null or char_length(file_path) <= 300),
  text text not null default '' check (char_length(text) <= 300),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- an image always has its file, and that file sits in the owner's own folder
  constraint vision_items_image_file check (kind <> 'image' or file_path is not null),
  constraint vision_items_file_owner check (file_path is null or split_part(file_path, '/', 1) = user_id::text)
);
create index if not exists vision_items_quarter on public.vision_items (user_id, quarter_id, position);
drop trigger if exists vision_items_updated_at on public.vision_items;
create trigger vision_items_updated_at before update on public.vision_items
  for each row execute function public.set_updated_at();

alter table public.vision_items enable row level security;
alter table public.vision_items force row level security;
drop policy if exists "vision_items owner select" on public.vision_items;
drop policy if exists "vision_items owner insert" on public.vision_items;
drop policy if exists "vision_items owner update" on public.vision_items;
drop policy if exists "vision_items owner delete" on public.vision_items;
create policy "vision_items owner select" on public.vision_items for select to authenticated using (user_id = auth.uid());
create policy "vision_items owner insert" on public.vision_items for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.quarters q where q.id = quarter_id and q.user_id = auth.uid()));
create policy "vision_items owner update" on public.vision_items for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "vision_items owner delete" on public.vision_items for delete to authenticated using (user_id = auth.uid());
revoke all on public.vision_items from anon;
grant select, insert, update, delete on public.vision_items to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vision-board', 'vision-board', false, 10485760,
        array['image/jpeg','image/png','image/webp','image/gif','image/heic'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "vision-board owner read" on storage.objects;
drop policy if exists "vision-board owner upload" on storage.objects;
drop policy if exists "vision-board owner delete" on storage.objects;
create policy "vision-board owner read" on storage.objects for select to authenticated
  using (bucket_id = 'vision-board' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "vision-board owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'vision-board' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "vision-board owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'vision-board' and (storage.foldername(name))[1] = auth.uid()::text);
