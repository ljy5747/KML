begin;
create temporary table sync_fixture as
select p.user_id,u.email from public.kml_profiles p join auth.users u on u.id=p.user_id
join public.kml_allowed_emails a on a.email=lower(u.email) and a.active order by a.role='admin' limit 1;
grant select on sync_fixture to authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',user_id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text,true) from sync_fixture;
set local role authenticated;
do $$declare first jsonb;next jsonb;specimen uuid:=gen_random_uuid();original text;begin
 first:=public.kml_sync_manifest();
 if first->>'schema'<>'1' or (select count(*) from jsonb_object_keys(first->'versions'))<>6 then raise exception 'FAIL incomplete manifest';end if;
 next:=public.kml_sync_manifest(first->'versions');
 if next->'rows'<>'{}'::jsonb then raise exception 'FAIL unchanged rows sent';end if;
 if exists(select 1 from jsonb_array_elements(first->'rows'->'kml_adults') x where not exists(select 1 from public.kml_adults a where a.id::text=x->>0 and to_jsonb(a.updated_at)=x->1)) then raise exception 'FAIL REST/version timestamp mismatch';end if;
 insert into public.kml_adults(id,code,lineage,sex,owner_id,breeder_id,created_by)
 values(specimen,'__SYNC_'||specimen,'꼴통A','M',auth.uid(),auth.uid(),auth.uid());
 next:=public.kml_sync_manifest(first->'versions');
 if next->'versions'->>'kml_adults'=first->'versions'->>'kml_adults' or not exists(select 1 from jsonb_array_elements(next->'rows'->'kml_adults') x where x->>0=specimen::text) then raise exception 'FAIL insert not detected';end if;
 first:=next;update public.kml_adults set note='changed' where id=specimen;
 next:=public.kml_sync_manifest(first->'versions');
 if next->'versions'->>'kml_adults'=first->'versions'->>'kml_adults' then raise exception 'FAIL edit not detected';end if;
 first:=next;delete from public.kml_adults where id=specimen;
 next:=public.kml_sync_manifest(first->'versions');
 if next->'versions'->>'kml_adults'=first->'versions'->>'kml_adults' or exists(select 1 from jsonb_array_elements(next->'rows'->'kml_adults') x where x->>0=specimen::text) then raise exception 'FAIL delete not detected';end if;
 first:=next;update public.kml_profiles set intro=coalesce(intro,'')||'__sync_test' where user_id=auth.uid();
 next:=public.kml_sync_manifest(first->'versions');
 if next->'versions'->>'kml_profiles'=first->'versions'->>'kml_profiles' then raise exception 'FAIL profile edit not detected';end if;
end;$$;
-- An authenticated but unapproved identity must fail, rather than receive hashes or IDs.
select set_config('request.jwt.claims',jsonb_build_object('sub',user_id,'email','unapproved-sync-test@example.invalid','role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text,true) from sync_fixture;
do $$begin
 begin perform public.kml_sync_manifest();raise exception 'FAIL unauthorized access';exception when insufficient_privilege then null;end;
end;$$;
reset role;
do $$begin
 if has_function_privilege('anon','public.kml_sync_manifest(jsonb)','EXECUTE') then raise exception 'FAIL anonymous execute';end if;
 if (select prosecdef from pg_proc where oid='public.kml_sync_manifest(jsonb)'::regprocedure) then raise exception 'FAIL RLS bypass';end if;
end;$$;
select 'PASS: authorized delta/unchanged/deleted/profile checks, invoker RLS, unauthorized and anonymous denial; rolled back' as result;
rollback;
