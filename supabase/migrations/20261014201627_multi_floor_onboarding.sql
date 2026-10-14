create function app_private.create_house_with_floors(house_name text, floor_names text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_house_id uuid;
  floor_name text;
  floor_index integer := 0;
begin
  if current_user_id is null then
    raise exception 'Sign in before creating a house' using errcode = '42501';
  end if;
  if house_name is null or char_length(btrim(house_name)) not between 1 and 120
    or floor_names is null or coalesce(array_length(floor_names, 1), 0) not between 1 and 20 then
    raise exception 'Invalid house or floors' using errcode = '22023';
  end if;
  if exists(select 1 from unnest(floor_names) as f(name) where name is null or char_length(btrim(name)) not between 1 and 80)
    or (select count(distinct lower(btrim(name))) from unnest(floor_names) as f(name)) <> cardinality(floor_names) then
    raise exception 'Invalid or duplicate floor names' using errcode = '22023';
  end if;

  -- Serialise repeated submissions from the same account; a retry is idempotent.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(current_user_id::text, 0));
  select m.house_id into new_house_id from public.house_members m
    where m.user_id = current_user_id order by m.created_at, m.id limit 1;
  if new_house_id is not null then return new_house_id; end if;

  insert into public.houses(name) values (btrim(house_name)) returning id into new_house_id;
  insert into public.house_members(house_id, user_id, role) values (new_house_id, current_user_id, 'owner');
  foreach floor_name in array floor_names loop
    insert into public.floors(house_id, name, sort_order) values (new_house_id, btrim(floor_name), floor_index);
    floor_index := floor_index + 1;
  end loop;
  return new_house_id;
end;
$$;
revoke all on function app_private.create_house_with_floors(text,text[]) from public, anon;
grant execute on function app_private.create_house_with_floors(text,text[]) to authenticated;
create function public.create_house_with_floors(house_name text, floor_names text[])
returns uuid language sql security invoker set search_path = ''
as $$ select app_private.create_house_with_floors(house_name, floor_names); $$;
revoke all on function public.create_house_with_floors(text,text[]) from public, anon;
grant execute on function public.create_house_with_floors(text,text[]) to authenticated;
