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
reset role;
insert into public.subtasks(project_id,name) values(current_setting('test.project_b')::uuid,'Fixture el');
select set_config('test.task_b',(select id::text from public.subtasks where project_id=current_setting('test.project_b')::uuid limit 1),true);
insert into public.floor_plans(floor_id,file_path) select id,id::text||'/fixture.png' from public.floors where house_id=current_setting('test.house_a')::uuid limit 1;
select set_config('test.plan_a',(select plan.id::text from public.floor_plans plan join public.floors f on f.id=plan.floor_id where f.house_id=current_setting('test.house_a')::uuid limit 1),true);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.user_b'),true);
insert into public.quote_drafts(project_id,subtask_id,title,description,photo_ids) select current_setting('test.project_b')::uuid,current_setting('test.task_b')::uuid,'El','Fixture description',array[id] from public.project_photos where project_id=current_setting('test.project_b')::uuid limit 1;
do $$ begin
 if (select count(*) from public.quote_drafts) <> 1 then raise exception 'Own draft inaccessible';end if;
 begin
  update public.quote_drafts set floor_plan_id=current_setting('test.plan_a')::uuid;
  raise exception 'Cross-house plan attachment allowed';
 exception when check_violation then null;end;
 begin
  update public.quote_drafts set photo_ids=array[gen_random_uuid()];
  raise exception 'Unknown photo attachment allowed';
 exception when check_violation then null;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.user_a'),true);
do $$ begin
 if exists(select 1 from public.quote_drafts) then raise exception 'Cross-house draft read';end if;
 update public.quote_drafts set title='Other account';
 if found then raise exception 'Cross-house draft update';end if;
end $$;
reset role;
update auth.users set email=id::text||'@example.invalid',email_confirmed_at=now() where id in(current_setting('test.user_a')::uuid,current_setting('test.user_b')::uuid);
select set_config('test.user_c',gen_random_uuid()::text,true);
insert into auth.users(id,email,email_confirmed_at) values(current_setting('test.user_c')::uuid,current_setting('test.user_c')||'@example.invalid',now());
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.user_b'),true);
select set_config('test.share',public.create_quote_share(current_setting('test.task_b')::uuid,current_setting('test.user_a')||'@example.invalid')::text,true);
update public.quote_drafts set description='New draft version';
select set_config('request.jwt.claim.sub',current_setting('test.user_a'),true);
do $$ begin
 if (select count(*) from public.quote_shares)<>1 then raise exception 'Recipient share missing';end if;
 if (select count(*) from public.quote_share_assets)<>1 then raise exception 'Recipient assets missing';end if;
 if (select description from public.quote_shares limit 1)<>'Fixture description' then raise exception 'Shared content mutated with draft';end if;
 if (select count(*) from storage.objects where bucket_id='project-photos')<>1 then raise exception 'Selected file inaccessible';end if;
 if exists(select 1 from public.projects where id=current_setting('test.project_b')::uuid) or exists(select 1 from public.project_photos where project_id=current_setting('test.project_b')::uuid) or exists(select 1 from public.quote_drafts where project_id=current_setting('test.project_b')::uuid) then raise exception 'Recipient sees source project data';end if;
 begin perform public.revoke_quote_share(current_setting('test.share')::uuid);raise exception 'Recipient can revoke owner share';exception when insufficient_privilege then null;end;
 begin perform public.create_quote_share(current_setting('test.task_b')::uuid,current_setting('test.user_c')||'@example.invalid');raise exception 'Recipient can reshare';exception when insufficient_privilege then null;end;
 begin insert into public.quote_share_assets(share_id,bucket,file_path,caption) values(current_setting('test.share')::uuid,'project-photos','fake','fake');raise exception 'Recipient can inject asset';exception when insufficient_privilege then null;end;
end $$;
-- Recipient may append, but cannot forge the sender or edit history.
insert into public.quote_responses(share_id,amount_dkk,price_type,scope,reservations,proposed_start,proposed_end) values(current_setting('test.share')::uuid,12500.50,'fixed','Fixture installation','Fixture exclusions','2026-11-01','2026-11-02');
do $$ begin
 if (select count(*) from public.quote_responses)<>1 then raise exception 'Own response unreadable';end if;
 if (select submitted_by from public.quote_responses limit 1)<>auth.uid() then raise exception 'Wrong submitter';end if;
 begin
 insert into public.quote_responses(share_id,amount_dkk,price_type,scope,submitted_by) values(current_setting('test.share')::uuid,1,'fixed','Forged',current_setting('test.user_b')::uuid);
 raise exception 'Forged submitter allowed';exception when insufficient_privilege then null;end;
 begin update public.quote_responses set amount_dkk=1;raise exception 'History can be edited';exception when insufficient_privilege then null;end;
 begin insert into public.quote_responses(share_id,amount_dkk,price_type,scope) values(current_setting('test.share')::uuid,-1,'fixed','Negative');raise exception 'Negative amount allowed';exception when check_violation then null;end;
 begin insert into public.quote_responses(share_id,amount_dkk,price_type,scope,proposed_start,proposed_end) values(current_setting('test.share')::uuid,1,'fixed','Bad dates','2026-11-02','2026-11-01');raise exception 'Invalid dates allowed';exception when check_violation then null;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.user_b'),true);
do $$ begin
 if (select count(*) from public.quote_responses)<>1 then raise exception 'Owner cannot read response';end if;
 begin insert into public.quote_responses(share_id,amount_dkk,price_type,scope) values(current_setting('test.share')::uuid,1,'fixed','Owner spoof');raise exception 'Owner can respond as recipient';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.user_c'),true);
do $$ begin
 if exists(select 1 from public.quote_responses) then raise exception 'Third party sees responses';end if;
 begin insert into public.quote_responses(share_id,amount_dkk,price_type,scope) values(current_setting('test.share')::uuid,1,'fixed','Other user');raise exception 'Third party writes response';exception when insufficient_privilege then null;end;
 if exists(select 1 from public.quote_shares) or exists(select 1 from public.quote_share_assets) or exists(select 1 from storage.objects where bucket_id='project-photos') then raise exception 'Unrelated user sees share/assets/files';end if;
end $$;
reset role;
update auth.users set email_confirmed_at=null where id=current_setting('test.user_a')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.user_a'),true);
do $$ begin if exists(select 1 from public.quote_shares) or exists(select 1 from public.quote_responses) then raise exception 'Unverified account sees share or response';end if;
 begin insert into public.quote_responses(share_id,amount_dkk,price_type,scope) values(current_setting('test.share')::uuid,1,'fixed','Unverified');raise exception 'Unverified response allowed';exception when insufficient_privilege then null;end;end $$;
reset role;
update auth.users set email_confirmed_at=now() where id=current_setting('test.user_a')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.user_b'),true);
select public.revoke_quote_share(current_setting('test.share')::uuid);
do $$ begin if (select count(*) from public.quote_responses)<>1 then raise exception 'Owner lost history after revocation';end if;end $$;
select set_config('request.jwt.claim.sub',current_setting('test.user_a'),true);
do $$ begin
 if exists(select 1 from public.quote_responses) then raise exception 'Revoked recipient sees response';end if;
 begin insert into public.quote_responses(share_id,amount_dkk,price_type,scope) values(current_setting('test.share')::uuid,1,'estimate','Revoked');raise exception 'Revoked recipient can respond';exception when insufficient_privilege then null;end;
 if exists(select 1 from public.quote_shares) or exists(select 1 from public.quote_share_assets) or exists(select 1 from storage.objects where bucket_id='project-photos') then raise exception 'Revoked recipient access still active';end if;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 begin perform 1 from public.quote_responses;raise exception 'Anonymous response access';exception when insufficient_privilege then null;end;
end $$;
rollback;
