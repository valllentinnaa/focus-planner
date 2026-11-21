-- Gift ideas can carry one image or PDF. Files live in a PRIVATE storage bucket, under a folder
-- named after the owner's user id; only the owner can upload, read (via short-lived signed URLs)
-- or delete them.

alter table public.gift_ideas
  add column file_path text check (file_path is null or char_length(file_path) <= 300),
  add column file_name text check (file_name is null or char_length(file_name) <= 200),
  add column file_type text check (file_type is null or file_type in ('image/jpeg','image/png','image/webp','image/gif','image/heic','application/pdf'));
-- A file must sit in the owner's own folder.
alter table public.gift_ideas add constraint gift_ideas_file_owner
  check (file_path is null or split_part(file_path, '/', 1) = user_id::text);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gift-files', 'gift-files', false, 10485760,
        array['image/jpeg','image/png','image/webp','image/gif','image/heic','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "gift-files owner read" on storage.objects for select to authenticated
  using (bucket_id = 'gift-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "gift-files owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'gift-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "gift-files owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'gift-files' and (storage.foldername(name))[1] = auth.uid()::text);
