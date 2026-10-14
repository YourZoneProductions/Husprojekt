create table public.quote_drafts (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 subtask_id uuid not null unique references public.subtasks(id) on delete cascade,
 title text not null check(char_length(btrim(title)) between 1 and 120),
 description text not null check(char_length(btrim(description)) between 1 and 5000),
 requested_by date,
 photo_ids uuid[] not null default '{}' check(cardinality(photo_ids)<=20),
 floor_plan_id uuid references public.floor_plans(id) on delete set null,
 updated_at timestamptz not null default now()
);
create index quote_drafts_project_idx on public.quote_drafts(project_id);
alter table public.quote_drafts enable row level security;
revoke all on public.quote_drafts from anon,authenticated;
grant select,insert,update on public.quote_drafts to authenticated;
create policy quote_drafts_read on public.quote_drafts for select to authenticated using(exists(select 1 from public.projects p where p.id=quote_drafts.project_id and public.is_house_member(p.house_id)));
create policy quote_drafts_add on public.quote_drafts for insert to authenticated with check(exists(select 1 from public.projects p where p.id=quote_drafts.project_id and public.is_house_member(p.house_id)));
create policy quote_drafts_edit on public.quote_drafts for update to authenticated using(exists(select 1 from public.projects p where p.id=quote_drafts.project_id and public.is_house_member(p.house_id))) with check(exists(select 1 from public.projects p where p.id=quote_drafts.project_id and public.is_house_member(p.house_id)));
create function app_private.validate_quote_draft() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.subtasks s where s.id=new.subtask_id and s.project_id=new.project_id) then
  raise exception 'Task must belong to the selected project' using errcode='23514';
 end if;
 if exists(select 1 from unnest(new.photo_ids) as selected(id) where not exists(select 1 from public.project_photos photo where photo.id=selected.id and photo.project_id=new.project_id)) then
  raise exception 'Photos must belong to the selected project' using errcode='23514';
 end if;
 if new.floor_plan_id is not null and not exists(select 1 from public.floor_plans plan join public.floors floor on floor.id=plan.floor_id join public.projects project on project.house_id=floor.house_id where plan.id=new.floor_plan_id and project.id=new.project_id) then
  raise exception 'Floor plan must belong to the project house' using errcode='23514';
 end if;
 new.updated_at=now();return new;
end;
$$;
revoke all on function app_private.validate_quote_draft() from public,anon;
grant execute on function app_private.validate_quote_draft() to authenticated;
create trigger validate_quote_draft before insert or update on public.quote_drafts for each row execute function app_private.validate_quote_draft();
