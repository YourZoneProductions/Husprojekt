-- House provisioning must be atomic: nobody can join a known house ID directly.
drop policy if exists "Users can add themselves to houses" on public.house_members;
drop policy if exists "Users can create houses" on public.houses;
revoke insert on public.houses from anon, authenticated;
revoke insert, update, delete on public.house_members from anon, authenticated;

create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated;

create function app_private.create_initial_house(house_name text, first_floor_name text, include_basement boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_house_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in before creating a house' using errcode = '42501';
  end if;
  if house_name is null or char_length(btrim(house_name)) not between 1 and 120
    or first_floor_name is null or char_length(btrim(first_floor_name)) not between 1 and 80 then
    raise exception 'Invalid house or floor name' using errcode = '22023';
  end if;

  -- Serialise repeated submissions from the same account; a retry is idempotent.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(current_user_id::text, 0));
  select m.house_id into new_house_id from public.house_members m
    where m.user_id = current_user_id order by m.created_at, m.id limit 1;
  if new_house_id is not null then return new_house_id; end if;

  insert into public.houses(name) values (btrim(house_name)) returning id into new_house_id;
  insert into public.house_members(house_id, user_id, role) values (new_house_id, current_user_id, 'owner');
  insert into public.floors(house_id, name, sort_order) values (new_house_id, btrim(first_floor_name), 0);
  if coalesce(include_basement, false) then
    insert into public.floors(house_id, name, sort_order) values (new_house_id, 'Kælder', 1);
  end if;
  return new_house_id;
end;
$$;
revoke all on function app_private.create_initial_house(text,text,boolean) from public, anon;
grant execute on function app_private.create_initial_house(text,text,boolean) to authenticated;

-- The exposed wrapper is INVOKER. No caller-supplied user or house ID is accepted.
create function public.create_initial_house(house_name text, first_floor_name text default 'Stueetage', include_basement boolean default false)
returns uuid language sql security invoker set search_path = ''
as $$ select app_private.create_initial_house(house_name, first_floor_name, include_basement); $$;
revoke all on function public.create_initial_house(text,text,boolean) from public, anon;
grant execute on function public.create_initial_house(text,text,boolean) to authenticated;

-- A project may only be linked to a room in the same house.
drop policy if exists "Members can manage project rooms" on public.project_rooms;
create policy "Members can manage project rooms" on public.project_rooms
for all to authenticated
using (exists (select 1 from public.projects p where p.id = project_rooms.project_id and public.is_house_member(p.house_id)))
with check (exists (
  select 1 from public.projects p
  join public.rooms r on r.id = project_rooms.room_id
  join public.floors f on f.id = r.floor_id
  where p.id = project_rooms.project_id and f.house_id = p.house_id and public.is_house_member(p.house_id)
));
