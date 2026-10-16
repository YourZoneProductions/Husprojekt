create table public.project_photos (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 stage text not null check (stage in ('before','during','after')),
 taken_on date not null,
 description text not null default '' check (char_length(description) <= 1000),
 file_path text not null unique,
 created_at timestamptz not null default now(),
 constraint project_photo_path check (file_path ~ ('^' || project_id::text || '/[0-9a-f-]{36}\.(png|jpg|webp)$'))
);
create index project_photos_project_date_idx on public.project_photos(project_id,taken_on desc,created_at desc);
alter table public.project_photos enable row level security;
revoke all on public.project_photos from anon,authenticated;
grant select,insert on public.project_photos to authenticated;
create policy project_photos_read on public.project_photos for select to authenticated using (
 exists(select 1 from public.projects p where p.id=project_photos.project_id and public.is_house_member(p.house_id))
);
create policy project_photos_add on public.project_photos for insert to authenticated with check (
 exists(select 1 from public.projects p where p.id=project_photos.project_id and public.is_house_member(p.house_id))
);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('project-photos','project-photos',false,10485760,array['image/png','image/jpeg','image/webp']);
create policy project_photo_files_read on storage.objects for select to authenticated using (
 bucket_id='project-photos' and exists(select 1 from public.projects p where p.id::text=(storage.foldername(name))[1] and public.is_house_member(p.house_id))
);
create policy project_photo_files_upload on storage.objects for insert to authenticated with check (
 bucket_id='project-photos' and array_length(storage.foldername(name),1)=1
 and exists(select 1 from public.projects p where p.id::text=(storage.foldername(name))[1] and public.is_house_member(p.house_id))
);
create policy project_photo_files_cleanup on storage.objects for delete to authenticated using (
 bucket_id='project-photos' and owner_id=(select auth.uid())::text
 and exists(select 1 from public.projects p where p.id::text=(storage.foldername(name))[1] and public.is_house_member(p.house_id))
 and not exists(select 1 from public.project_photos photo where photo.file_path=storage.objects.name)
);
