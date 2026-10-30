begin;
create temporary table people_fixture as
select p.user_id,u.email,a.role from public.kml_profiles p join auth.users u on u.id=p.user_id join public.kml_allowed_emails a on a.email=lower(u.email) and a.active;
create temporary table people_record(id uuid);insert into people_record values(gen_random_uuid());
grant select on people_fixture,people_record to authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',user_id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text,true) from people_fixture where role='admin' limit 1;
set local role authenticated;
do $$declare target uuid;specimen uuid;begin
 if not public.kml_admin() then raise exception 'Admin fixture required';end if;
 select user_id into strict target from people_fixture where role='member' limit 1;select id into specimen from people_record;
 insert into public.kml_adults(id,code,lineage,sex,breeder_id,owner_id,created_by) values(specimen,'__PEOPLE_'||specimen,'꼴통A','M',auth.uid(),auth.uid(),auth.uid());
 update public.kml_adults set owner_id=target,breeder_id=null,breeder_name='외부 브리더' where id=specimen;
 if not exists(select 1 from public.kml_adults where id=specimen and owner_id=target and breeder_id is null and breeder_name='외부 브리더') then raise exception 'FAIL admin owner/external breeder update';end if;
 update public.kml_adults set breeder_id=target,breeder_name='' where id=specimen;
 if not exists(select 1 from public.kml_adults where id=specimen and breeder_id=target and breeder_name='') then raise exception 'FAIL member breeder relink';end if;
 begin
  update public.kml_adults set breeder_name='ambiguous' where id=specimen;raise exception 'FAIL member and external values simultaneously accepted';
 exception when check_violation then null;end;
end;$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',user_id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text,true) from people_fixture where role='member' limit 1;
set local role authenticated;
do $$declare target uuid;specimen uuid;stamp timestamptz;fresh uuid:=gen_random_uuid();begin
 select id into specimen from people_record;select user_id into target from people_fixture where role='admin' limit 1;
 begin
  update public.kml_adults set owner_id=target where id=specimen;raise exception 'FAIL member reassigned owner';
 exception when insufficient_privilege then null;end;
 select updated_at into stamp from public.kml_adults where id=specimen;
 perform public.kml_import_excel(jsonb_build_array(jsonb_build_object('kind','adults','id',specimen,'version',stamp,'payload',jsonb_build_object('breeder_id',null,'breeder_name','Excel 외부'))));
 if not exists(select 1 from public.kml_adults where id=specimen and breeder_name='Excel 외부' and breeder_id is null and owner_id=auth.uid()) then raise exception 'FAIL external Excel save';end if;
 select updated_at into stamp from public.kml_adults where id=specimen;
 perform public.kml_import_excel(jsonb_build_array(jsonb_build_object('kind','adults','id',specimen,'version',stamp,'payload',jsonb_build_object('breeder_id',auth.uid(),'breeder_name',''))));
 if not exists(select 1 from public.kml_adults where id=specimen and breeder_id=auth.uid() and breeder_name='') then raise exception 'FAIL Excel member relink';end if;
 perform public.kml_import_excel(jsonb_build_array(jsonb_build_object('kind','adults','id',fresh,'payload',jsonb_build_object('code','__EXTERNAL_'||fresh,'lineage','꼴통A','sex','F','breeder_id',null,'breeder_name','신규 외부'))));
 if not exists(select 1 from public.kml_adults where id=fresh and breeder_name='신규 외부' and breeder_id is null) then raise exception 'FAIL new external Excel insert';end if;
end;$$;
reset role;
select 'PASS: admin breeder/owner changes, member RLS blocks owner changes, external/member exclusivity and authenticated Excel roundtrip; rolled back' as result;
rollback;
