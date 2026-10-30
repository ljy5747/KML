begin;
create temporary table partial_year_fixture as select p.user_id,u.email from public.kml_profiles p join auth.users u on u.id=p.user_id join public.kml_allowed_emails a on a.email=lower(u.email) and a.active limit 1;
grant select on partial_year_fixture to authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',user_id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text,true) from partial_year_fixture;
set local role authenticated;
do $$declare specimen uuid:=gen_random_uuid();stamp timestamptz;begin
 insert into public.kml_adults(id,code,lineage,sex,owner_id,breeder_id,created_by,emerged,emerged_year) values(specimen,'__YEAR_'||specimen,'꼴통A','M',auth.uid(),auth.uid(),auth.uid(),null,2024);
 if not exists(select 1 from public.kml_adults where id=specimen and emerged is null and emerged_year=2024) then raise exception 'FAIL year-only persistence';end if;
 update public.kml_adults set emerged='2025-07-01' where id=specimen;
 if not exists(select 1 from public.kml_adults where id=specimen and emerged_year=2025) then raise exception 'FAIL complete-date year sync';end if;
 select updated_at into stamp from public.kml_adults where id=specimen;
 perform public.kml_import_excel(jsonb_build_array(jsonb_build_object('kind','adults','id',specimen,'version',stamp,'payload',jsonb_build_object('emerged',null,'emerged_year',2023))));
 if not exists(select 1 from public.kml_adults where id=specimen and emerged is null and emerged_year=2023) then raise exception 'FAIL Excel year-only save';end if;
 begin update public.kml_adults set emerged_year=0 where id=specimen;raise exception 'FAIL invalid year accepted';exception when check_violation then null;end;
end;$$;
reset role;
select 'PASS: year-only persistence, complete-date sync, authenticated Excel year-only update and invalid-year guard; rolled back' as result;
rollback;
