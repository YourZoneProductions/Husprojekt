-- Append-only floor-plan versions; no existing house/room/project data is changed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('floor-plans', 'floor-plans', false, 10485760, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

do $$ begin
  if not exists (
    select 1 from storage.buckets where id = 'floor-plans' and public = false
      and file_size_limit = 10485760
      and allowed_mime_types = array['image/png','image/jpeg','image/webp']
  ) then
    raise exception 'floor-plans bucket configuration does not match the private upload contract';
  end if;
end $$;

create policy "floor_plan_members_read" on storage.objects
for select to authenticated
using (
  bucket_id = 'floor-plans'
  and exists (
    select 1 from public.floors f
    where f.id::text = (storage.foldername(name))[1]
      and public.is_house_member(f.house_id)
  )
);

create policy "floor_plan_members_upload" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'floor-plans'
  and array_length(storage.foldername(name), 1) = 1
  and exists (
    select 1 from public.floors f
    where f.id::text = (storage.foldername(name))[1]
      and public.is_house_member(f.house_id)
  )
);

-- Only clean up the current user's own failed uploads. Existing images are never overwritten.
create policy "floor_plan_upload_owner_cleanup" on storage.objects
for delete to authenticated
using (
  bucket_id = 'floor-plans'
  and owner_id = (select auth.uid())::text
  and exists (
    select 1 from public.floors f
    where f.id::text = (storage.foldername(name))[1]
      and public.is_house_member(f.house_id)
  )
);
