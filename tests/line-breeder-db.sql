begin;
create temporary table line_people_fixture as
select p.user_id,u.email,a.role from public.kml_profiles p join auth.users u on u.id=p.user_id join public.kml_allowed_emails a on a.email=lower(u.email) and a.active;
create temporary table line_people_records(line uuid,male uuid,female uuid,larva uuid);
insert into line_people_records values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
grant select on line_people_fixture,line_people_records to authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',user_id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text,true) from line_people_fixture where role='admin' limit 1;
set local role authenticated;
do $$declare r record;target uuid;begin
 if not public.kml_admin() then raise exception 'Admin fixture required';end if;
 select * into r from line_people_records;select user_id into strict target from line_people_fixture where role='member' limit 1;
 insert into public.kml_adults(id,code,lineage,sex,owner_id,breeder_id,created_by) values(r.male,'__LINE_M_'||r.male,'꼴통A','M',auth.uid(),auth.uid(),auth.uid()),(r.female,'__LINE_F_'||r.female,'꼴통A','F',auth.uid(),auth.uid(),auth.uid());
 insert into public.kml_lines(id,name,father_id,mother_id,year,created_by) values(r.line,'__LINE_PEOPLE_'||r.line,r.male,r.female,2026,auth.uid());
 insert into public.kml_larvae(id,line_id,number,sex,created_by) values(r.larva,r.line,'001','U',auth.uid());
 update public.kml_lines set created_by=target where id=r.line;
 if not exists(select 1 from public.kml_lines where id=r.line and created_by=target and father_id=r.male and mother_id=r.female and year=2026) then raise exception 'FAIL admin line reassignment/parent preservation';end if;
 if not exists(select 1 from public.kml_larvae where id=r.larva and line_id=r.line) then raise exception 'FAIL larva connection lost';end if;
end;$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',user_id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text,true) from line_people_fixture where role='member' limit 1;
set local role authenticated;
do $$declare r record;target uuid;begin
 select * into r from line_people_records;select user_id into target from line_people_fixture where role='admin' limit 1;
 update public.kml_larvae set number='002' where id=r.larva;
 if not exists(select 1 from public.kml_larvae where id=r.larva and number='002') then raise exception 'FAIL new line breeder cannot edit larvae';end if;
 begin update public.kml_lines set created_by=target where id=r.line;raise exception 'FAIL member reassigned line';exception when insufficient_privilege then null;end;
end;$$;
reset role;
select 'PASS: admin line breeder reassignment, parents/year/larvae preserved, new breeder larva editing and member RLS guard; rolled back' as result;
rollback;
