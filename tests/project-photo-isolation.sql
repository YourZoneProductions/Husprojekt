-- Run as the migration administrator. Every fixture is rolled back.
begin;
select set_config('test.user_a', gen_random_uuid()::text, true);
select set_config('test.user_b', gen_random_uuid()::text, true);
insert into auth.users(id) values (current_setting('test.user_a')::uuid),(current_setting('test.user_b')::uuid);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.user_a'),true);
select set_config('test.house_a',public.create_house_with_floors('Account test A',array['Kælder','Stueetage','1. Sal','2. Sal'])::text,true);
do $$ begin
 if public.create_house_with_floors('Retry',array['Other']) <> current_setting('test.house_a')::uuid then raise exception 'Duplicate house on retry';end if;
 if (select count(*) from public.houses) <> 1 then raise exception 'User A sees other houses';end if;
 if (select array_agg(name order by sort_order) from public.floors) <> array['Kælder','Stueetage','1. Sal','2. Sal'] then raise exception 'Incorrect floor names/order';end if;
 if (select count(*) from public.floors) <> 4 then raise exception 'Initial floors missing';end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.user_b'),true);
select set_config('test.house_b',public.create_house_with_floors('Account test B',array['Tagetage'])::text,true);
do $$ begin
 if (select count(*) from public.houses) <> 1 then raise exception 'User B sees other houses';end if;
 if exists(select 1 from public.houses where id=current_setting('test.house_a')::uuid) then raise exception 'Cross-account read allowed';end if;
 begin
  insert into public.house_members(house_id,user_id,role) values(current_setting('test.house_a')::uuid,auth.uid(),'owner');
  raise exception 'Cross-account membership allowed';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.houses(name) values('Bypass');raise exception 'Direct creation bypass allowed';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
-- Both houses are fixture-owned; also test a cross-house link when the caller
-- legitimately belongs to both houses, so SELECT filtering cannot hide the bug.
insert into public.house_members(house_id,user_id,role) values(current_setting('test.house_a')::uuid,current_setting('test.user_b')::uuid,'member');
insert into public.rooms(floor_id,name) select id,'Fixture room' from public.floors where house_id=current_setting('test.house_a')::uuid limit 1;
select set_config('test.room_a',(select r.id::text from public.rooms r join public.floors f on f.id=r.floor_id where f.house_id=current_setting('test.house_a')::uuid limit 1),true);
insert into public.projects(house_id,name) values(current_setting('test.house_b')::uuid,'Fixture project');
select set_config('test.project_b',(select id::text from public.projects where house_id=current_setting('test.house_b')::uuid limit 1),true);
set local role authenticated;
do $$ begin
 begin
  insert into public.project_rooms(project_id,room_id) values(current_setting('test.project_b')::uuid,current_setting('test.room_a')::uuid);
  raise exception 'Cross-house room link allowed';
 exception when insufficient_privilege then null;end;
end $$;
-- Add a fixture photo in house B and verify member-only access.
insert into public.project_photos(project_id,stage,taken_on,description,file_path) values(current_setting('test.project_b')::uuid,'before','2026-10-14','Fixture',current_setting('test.project_b')||'/'||gen_random_uuid()::text||'.png');
do $$ begin
 if (select count(*) from public.project_photos) <> 1 then raise exception 'Own photo inaccessible';end if;
end $$;
insert into storage.objects(bucket_id,name,owner_id) select 'project-photos',file_path,auth.uid()::text from public.project_photos;
do $$ begin
 if (select count(*) from storage.objects where bucket_id='project-photos') <> 1 then raise exception 'Own photo file inaccessible';end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.user_a'),true);
do $$ begin
 if exists(select 1 from storage.objects where bucket_id='project-photos') then raise exception 'Cross-house file read';end if;
 begin
 insert into storage.objects(bucket_id,name,owner_id) values('project-photos',current_setting('test.project_b')||'/'||gen_random_uuid()::text||'.png',auth.uid()::text);
 raise exception 'Cross-house file upload allowed';
 exception when insufficient_privilege then null;end;
 if exists(select 1 from public.project_photos) then raise exception 'Cross-house photo read';end if;
 begin
 insert into public.project_photos(project_id,stage,taken_on,file_path) values(current_setting('test.project_b')::uuid,'after','2026-10-14',current_setting('test.project_b')||'/'||gen_random_uuid()::text||'.png');
 raise exception 'Cross-house photo insert';
 exception when insufficient_privilege then null;end;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 begin
 perform 1 from public.project_photos;raise exception 'Anonymous table access';
 exception when insufficient_privilege then null;end;
end $$;
rollback;
