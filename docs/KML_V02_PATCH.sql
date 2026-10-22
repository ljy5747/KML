-- KML v0.2 follow-up: move privileged transfer implementation outside exposed schema.
create schema if not exists kml_internal;
revoke all on schema kml_internal from public, anon;
grant usage on schema kml_internal to authenticated;

create or replace function kml_internal.transfer_adult(p_adult_id uuid,p_to_user uuid,p_date date,p_note text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare v_old uuid;
begin
  if (select auth.uid()) is null or not (select public.kml_authorized()) then raise exception 'Not authorized'; end if;
  if p_date is null or p_date>current_date then raise exception 'Invalid transfer date'; end if;
  if length(coalesce(p_note,''))>1000 then raise exception 'Note too long'; end if;
  if not exists (select 1 from public.kml_profiles where user_id=p_to_user) then raise exception 'Unknown recipient'; end if;
  select owner_id into v_old from public.kml_adults where id=p_adult_id for update;
  if not found then raise exception 'Adult not found'; end if;
  if v_old is distinct from (select auth.uid()) and not (select public.kml_admin()) then raise exception 'Only current owner or admin may transfer'; end if;
  if v_old is not distinct from p_to_user then raise exception 'Already owned by recipient'; end if;
  update public.kml_adults set owner_id=p_to_user where id=p_adult_id;
  insert into public.kml_transfers(adult_id,from_user,to_user,transfer_date,note,recorded_by)
    values(p_adult_id,v_old,p_to_user,p_date,coalesce(p_note,''),(select auth.uid()));
end;$$;
revoke all on function kml_internal.transfer_adult(uuid,uuid,date,text) from public,anon;
grant execute on function kml_internal.transfer_adult(uuid,uuid,date,text) to authenticated;

create or replace function public.kml_transfer_adult(p_adult_id uuid,p_to_user uuid,p_date date,p_note text default '')
returns void language sql security invoker set search_path = '' as $$
  select kml_internal.transfer_adult(p_adult_id,p_to_user,p_date,p_note);
$$;
revoke all on function public.kml_transfer_adult(uuid,uuid,date,text) from public,anon;
grant execute on function public.kml_transfer_adult(uuid,uuid,date,text) to authenticated;

-- Indexes for common pedigree and line lookup paths.
create index if not exists kml_adults_breeder_idx on public.kml_adults(breeder_id);
create index if not exists kml_adults_owner_idx on public.kml_adults(owner_id);
create index if not exists kml_adults_father_idx on public.kml_adults(father_id);
create index if not exists kml_adults_mother_idx on public.kml_adults(mother_id);
create index if not exists kml_lines_father_idx on public.kml_lines(father_id);
create index if not exists kml_lines_mother_idx on public.kml_lines(mother_id);
create index if not exists kml_larvae_line_idx on public.kml_larvae(line_id);
create index if not exists kml_comments_adult_idx on public.kml_comments(adult_id);
create index if not exists kml_transfers_adult_idx on public.kml_transfers(adult_id);