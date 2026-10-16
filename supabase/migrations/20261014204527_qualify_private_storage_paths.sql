alter policy project_photo_files_read on storage.objects to authenticated using (
 bucket_id='project-photos' and exists(select 1 from public.projects p where p.id::text=(storage.foldername(storage.objects.name))[1] and public.is_house_member(p.house_id))
);
alter policy project_photo_files_upload on storage.objects to authenticated with check (
 bucket_id='project-photos' and array_length(storage.foldername(storage.objects.name),1)=1
 and exists(select 1 from public.projects p where p.id::text=(storage.foldername(storage.objects.name))[1] and public.is_house_member(p.house_id))
);
alter policy project_photo_files_cleanup on storage.objects to authenticated using (
 bucket_id='project-photos' and owner_id=(select auth.uid())::text
 and exists(select 1 from public.projects p where p.id::text=(storage.foldername(storage.objects.name))[1] and public.is_house_member(p.house_id))
 and not exists(select 1 from public.project_photos photo where photo.file_path=storage.objects.name)
);

alter policy "floor_plan_members_read" on storage.objects
to authenticated
using (
  bucket_id = 'floor-plans'
  and exists (
    select 1 from public.floors f
    where f.id::text = (storage.foldername(storage.objects.name))[1]
      and public.is_house_member(f.house_id)
  )
);

alter policy "floor_plan_members_upload" on storage.objects
to authenticated
with check (
  bucket_id = 'floor-plans'
  and array_length(storage.foldername(storage.objects.name), 1) = 1
  and exists (
    select 1 from public.floors f
    where f.id::text = (storage.foldername(storage.objects.name))[1]
      and public.is_house_member(f.house_id)
  )
);

-- Only clean up the current user's own failed uploads. Existing images are never overwritten.
alter policy "floor_plan_upload_owner_cleanup" on storage.objects
to authenticated
using (
  bucket_id = 'floor-plans'
  and owner_id = (select auth.uid())::text
  and exists (
    select 1 from public.floors f
    where f.id::text = (storage.foldername(storage.objects.name))[1]
      and public.is_house_member(f.house_id)
  )
);
