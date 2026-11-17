-- Lightweight, RLS-preserving change checks. No user records or sync triggers are altered.
create or replace function public.kml_sync_manifest(p_known jsonb default '{}'::jsonb)
returns jsonb
language plpgsql stable security invoker
set search_path = ''
as $$
declare
  item record;
  signature text;
  versions jsonb := '{}'::jsonb;
  changed_rows jsonb := '{}'::jsonb;
  profiles jsonb;
  labels jsonb := '[]'::jsonb;
begin
  if not coalesce(public.kml_authorized(),false) then
    raise exception 'KML access required' using errcode = '42501';
  end if;
  -- These columns are small even when photos and source_data contain large images.
  for item in
    select 'kml_adults' as name, coalesce(jsonb_agg(jsonb_build_array(id,updated_at) order by id),'[]'::jsonb) as entries from public.kml_adults
    union all
    select 'kml_lines', coalesce(jsonb_agg(jsonb_build_array(id,updated_at) order by id),'[]'::jsonb) from public.kml_lines
    union all
    select 'kml_larvae', coalesce(jsonb_agg(jsonb_build_array(id,updated_at) order by id),'[]'::jsonb) from public.kml_larvae
  loop
    signature := md5(item.entries::text);
    versions := versions || jsonb_build_object(item.name,signature);
    if p_known->>item.name is distinct from signature then
      changed_rows := changed_rows || jsonb_build_object(item.name,item.entries);
    end if;
  end loop;
  -- Small, unversioned tables use content hashes, including edits and deletions.
  -- Hashing happens inside Postgres; photos/nicknames are not sent during a check.
  select coalesce(jsonb_agg(to_jsonb(p) order by p.user_id),'[]'::jsonb) into profiles from public.kml_profiles p;
  if not public.kml_admin() then
    select coalesce(jsonb_agg(to_jsonb(p) order by p.user_id),'[]'::jsonb) into labels from public.kml_visible_breeder_labels() p;
  end if;
  versions := versions || jsonb_build_object('kml_profiles',md5(profiles::text || labels::text));
  select md5(coalesce(jsonb_agg(to_jsonb(c) order by c.id),'[]'::jsonb)::text) into signature from public.kml_comments c;
  versions := versions || jsonb_build_object('kml_comments',signature);
  select md5(coalesce(jsonb_agg(to_jsonb(t) order by t.id),'[]'::jsonb)::text) into signature from public.kml_transfers t;
  versions := versions || jsonb_build_object('kml_transfers',signature);
  return jsonb_build_object('schema',1,'versions',versions,'rows',changed_rows);
end;
$$;
revoke all on function public.kml_sync_manifest(jsonb) from public, anon;
grant execute on function public.kml_sync_manifest(jsonb) to authenticated;
