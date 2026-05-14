-- Optional incident photo stored in Supabase Storage (private bucket).
alter table public.incidents
  add column if not exists photo_storage_path text;

comment on column public.incidents.photo_storage_path is
  'Object path in incident-photos bucket: {org_id}/{incident_id}/{filename}.';

-- Replace broad incidents policy with granular rules (owners cannot insert).
drop policy if exists "incidents_all_org" on public.incidents;

create policy "incidents_select_org" on public.incidents
  for select to authenticated
  using (org_id = public.current_org_id());

create policy "incidents_insert_non_owner" on public.incidents
  for insert to authenticated
  with check (
    org_id = public.current_org_id()
    and reported_by = auth.uid()
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid()
        and pr.org_id = public.current_org_id()
        and pr.role <> 'owner'
    )
  );

create policy "incidents_update_org" on public.incidents
  for update to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy "incidents_delete_org" on public.incidents
  for delete to authenticated
  using (org_id = public.current_org_id());

-- Private bucket for incident images (5 MB max, common image types).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'incident-photos',
  'incident-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "incident_photos_select_org" on storage.objects;
create policy "incident_photos_select_org" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'incident-photos'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.org_id is not null
        and (storage.foldername(name))[1] = p.org_id::text
    )
  );

drop policy if exists "incident_photos_insert_org" on storage.objects;
create policy "incident_photos_insert_org" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'incident-photos'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.org_id is not null
        and (storage.foldername(name))[1] = p.org_id::text
    )
  );

drop policy if exists "incident_photos_update_org" on storage.objects;
create policy "incident_photos_update_org" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'incident-photos'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.org_id is not null
        and (storage.foldername(name))[1] = p.org_id::text
    )
  )
  with check (
    bucket_id = 'incident-photos'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.org_id is not null
        and (storage.foldername(name))[1] = p.org_id::text
    )
  );

drop policy if exists "incident_photos_delete_org" on storage.objects;
create policy "incident_photos_delete_org" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'incident-photos'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.org_id is not null
        and (storage.foldername(name))[1] = p.org_id::text
    )
  );
