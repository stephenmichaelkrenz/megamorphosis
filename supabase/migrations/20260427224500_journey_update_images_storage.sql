insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'journey-update-images',
  'journey-update-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Journey update images are publicly readable" on storage.objects;
create policy "Journey update images are publicly readable"
on storage.objects for select
using (bucket_id = 'journey-update-images');

drop policy if exists "Users can upload their own journey update images" on storage.objects;
create policy "Users can upload their own journey update images"
on storage.objects for insert
with check (
  bucket_id = 'journey-update-images'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "Users can update their own journey update images" on storage.objects;
create policy "Users can update their own journey update images"
on storage.objects for update
using (
  bucket_id = 'journey-update-images'
  and auth.uid()::text = split_part(name, '/', 1)
)
with check (
  bucket_id = 'journey-update-images'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "Users can delete their own journey update images" on storage.objects;
create policy "Users can delete their own journey update images"
on storage.objects for delete
using (
  bucket_id = 'journey-update-images'
  and auth.uid()::text = split_part(name, '/', 1)
);
