-- Verified account email is read from Auth, not editable user metadata or stale JWT claims.
create function app_private.verified_email() returns text language sql stable security definer set search_path='' as $$
 select lower(email) from auth.users where id=auth.uid() and email_confirmed_at is not null;
$$;
revoke all on function app_private.verified_email() from public,anon;
grant execute on function app_private.verified_email() to authenticated;
create table public.quote_shares (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 subtask_id uuid references public.subtasks(id) on delete set null,
 recipient_email text not null,
 title text not null,
 description text not null,
 requested_by date,
 created_at timestamptz not null default now(),
 revoked_at timestamptz
);
create index quote_shares_project_idx on public.quote_shares(project_id);
create index quote_shares_recipient_idx on public.quote_shares(recipient_email) where revoked_at is null;
create table public.quote_share_assets (
 id uuid primary key default gen_random_uuid(),
 share_id uuid not null references public.quote_shares(id) on delete cascade,
 bucket text not null check(bucket in ('project-photos','floor-plans')),
 file_path text not null,
 caption text not null,
 unique(share_id,bucket,file_path)
);
create index quote_share_assets_path_idx on public.quote_share_assets(bucket,file_path);
alter table public.quote_shares enable row level security;
alter table public.quote_share_assets enable row level security;
revoke all on public.quote_shares,public.quote_share_assets from anon,authenticated;
grant select on public.quote_shares,public.quote_share_assets to authenticated;
create policy quote_shares_read on public.quote_shares for select to authenticated using (
 (revoked_at is null and recipient_email=(select app_private.verified_email()))
 or exists(select 1 from public.projects p where p.id=quote_shares.project_id and public.is_house_member(p.house_id))
);
create policy quote_share_assets_read on public.quote_share_assets for select to authenticated using (
 exists(select 1 from public.quote_shares share where share.id=quote_share_assets.share_id and share.revoked_at is null
 and (share.recipient_email=(select app_private.verified_email()) or exists(select 1 from public.projects p where p.id=share.project_id and public.is_house_member(p.house_id))))
);
create policy quote_recipient_files_read on storage.objects for select to authenticated using (
 exists(select 1 from public.quote_share_assets asset join public.quote_shares share on share.id=asset.share_id
 where asset.bucket=storage.objects.bucket_id and asset.file_path=storage.objects.name and share.revoked_at is null
 and share.recipient_email=(select app_private.verified_email()))
);
create function app_private.create_quote_share(task_id uuid,recipient text) returns uuid language plpgsql security definer set search_path='' as $$
declare draft public.quote_drafts; share_id uuid; email text:=lower(btrim(recipient));
begin
 if auth.uid() is null then raise exception 'Sign in first' using errcode='42501';end if;
 select d.* into draft from public.quote_drafts d where d.subtask_id=task_id and exists(select 1 from public.projects p where p.id=d.project_id and public.is_house_member(p.house_id));
 if draft.id is null then raise exception 'Draft inaccessible' using errcode='42501';end if;
 if email is null or char_length(email)>254 or email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid recipient email' using errcode='22023';end if;
 -- Revalidate all selected assets against their current project/house and private files.
 if exists(select 1 from unnest(draft.photo_ids) chosen(id) where not exists(select 1 from public.project_photos photo join storage.objects object on object.bucket_id='project-photos' and object.name=photo.file_path where photo.id=chosen.id and photo.project_id=draft.project_id)) then raise exception 'Selected photo unavailable' using errcode='23514';end if;
 if draft.floor_plan_id is not null and not exists(select 1 from public.floor_plans plan join public.floors f on f.id=plan.floor_id join public.projects p on p.house_id=f.house_id join storage.objects object on object.bucket_id='floor-plans' and object.name=plan.file_path where plan.id=draft.floor_plan_id and p.id=draft.project_id) then raise exception 'Selected floor plan unavailable' using errcode='23514';end if;
 insert into public.quote_shares(project_id,subtask_id,recipient_email,title,description,requested_by) values(draft.project_id,draft.subtask_id,email,draft.title,draft.description,draft.requested_by) returning id into share_id;
 insert into public.quote_share_assets(share_id,bucket,file_path,caption) select share_id,'project-photos',photo.file_path,concat(case photo.stage when 'before' then 'Før' when 'after' then 'Efter' else 'Undervejs' end,' · ',photo.taken_on,' · ',photo.description) from public.project_photos photo where photo.id=any(draft.photo_ids) and photo.project_id=draft.project_id;
 insert into public.quote_share_assets(share_id,bucket,file_path,caption) select share_id,'floor-plans',plan.file_path,concat('Plantegning · ',f.name) from public.floor_plans plan join public.floors f on f.id=plan.floor_id where plan.id=draft.floor_plan_id;
 return share_id;
end;
$$;
create function app_private.revoke_quote_share(target_share uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first' using errcode='42501';end if;
 update public.quote_shares share set revoked_at=coalesce(share.revoked_at,now()) where share.id=target_share and exists(select 1 from public.projects p where p.id=share.project_id and public.is_house_member(p.house_id));
 if not found then raise exception 'Share inaccessible' using errcode='42501';end if;
end;
$$;
revoke all on function app_private.create_quote_share(uuid,text),app_private.revoke_quote_share(uuid) from public,anon;
grant execute on function app_private.create_quote_share(uuid,text),app_private.revoke_quote_share(uuid) to authenticated;
create function public.create_quote_share(task_id uuid,recipient text) returns uuid language sql security invoker set search_path='' as $$select app_private.create_quote_share(task_id,recipient);$$;
create function public.revoke_quote_share(target_share uuid) returns void language sql security invoker set search_path='' as $$select app_private.revoke_quote_share(target_share);$$;
revoke all on function public.create_quote_share(uuid,text),public.revoke_quote_share(uuid) from public,anon;
grant execute on function public.create_quote_share(uuid,text),public.revoke_quote_share(uuid) to authenticated;
