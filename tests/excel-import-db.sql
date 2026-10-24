begin;
create temporary table excel_fixture as select v.id as larva_id,v.line_id,l.created_by as owner_id,u.email from public.kml_larvae v join public.kml_lines l on l.id=v.line_id join auth.users u on u.id=l.created_by join public.kml_allowed_emails a on a.email=lower(u.email) and a.active where v.beetlelog_owner_id=l.created_by and jsonb_array_length(v.records)>0 and jsonb_array_length(v.source_data->'bottleRecords')>0 limit 1;
do $$begin if not exists(select 1 from excel_fixture)then raise exception 'Linked fixture required';end if;end;$$;
grant select on excel_fixture to authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text,true) from excel_fixture;
set local role authenticated;
do $$
declare child uuid:=gen_random_uuid();parent uuid:=gen_random_uuid();f record;v public.kml_larvae%rowtype;stamp timestamptz;result jsonb;original jsonb;old_records jsonb;new_larva uuid:=gen_random_uuid();
begin
 select * into f from excel_fixture;
 result:=public.kml_import_excel(jsonb_build_array(
 jsonb_build_object('kind','adults','id',child,'payload',jsonb_build_object('code','__EXCEL_CHILD_'||child,'lineage','꼴통A','sex','M','father_id',parent)),
 jsonb_build_object('kind','adults','id',parent,'payload',jsonb_build_object('code','__EXCEL_PARENT_'||parent,'lineage','꼴통A','sex','M'))));
 if (result->>'inserted')::int<>2 or (select father_id from public.kml_adults where id=child)<>parent then raise exception 'FAIL adult forward parent links';end if;
 update public.kml_adults set photo_url='https://example.com/preserved.jpg' where id=child;
 select updated_at into stamp from public.kml_adults where id=child;
 perform public.kml_import_excel(jsonb_build_array(jsonb_build_object('kind','adults','id',child,'version',stamp,'payload',jsonb_build_object('note','Excel note'))));
 if not exists(select 1 from public.kml_adults where id=child and owner_id=f.owner_id and photo_url='https://example.com/preserved.jpg' and lineage='꼴통A' and note='Excel note') then raise exception 'FAIL partial field preservation';end if;
 begin
  perform public.kml_import_excel(jsonb_build_array(jsonb_build_object('kind','adults','id',child,'version',stamp,'payload',jsonb_build_object('note','stale'))));
  raise exception 'FAIL stale write accepted';
 exception when others then if sqlerrm not like '성충이 다른 앱%' then raise;end if;end;
 perform public.kml_import_excel(jsonb_build_array(jsonb_build_object('kind','larvae','id',new_larva,'payload',jsonb_build_object('line_id',f.line_id,'number','__EXCEL_NEW_'||new_larva,'bottle_changes',jsonb_build_array(jsonb_build_object('index',0,'values',jsonb_build_object('date','2026-07-01','feedBrand','A','weight','0','bottleSize','800')))))));
 if not exists(select 1 from public.kml_larvae where id=new_larva and records->0->>3='0' and sex='U') then raise exception 'FAIL new larva zero values';end if;
 update public.kml_larvae set source_data=jsonb_set(source_data,'{bottleRecords,0,excelRegression}','"keep"') where id=f.larva_id;
 select * into v from public.kml_larvae where id=f.larva_id;
 perform public.kml_import_excel(jsonb_build_array(jsonb_build_object('kind','larvae','id',v.id,'version',v.updated_at,'payload',jsonb_build_object('line_id',v.line_id,'bottle_changes',jsonb_build_array(jsonb_build_object('index',0,'values',jsonb_build_object('date','2026-07-02','weight','0','feedBrand','Excel feed')))))));
 if not exists(select 1 from public.kml_larvae where id=v.id and records->0->>3='0' and source_data->'bottleRecords'->0->>'excelRegression'='keep') then raise exception 'FAIL KML metadata preservation';end if;
 if not exists(select 1 from public.beetlelog_data b cross join lateral jsonb_array_elements(b.data->'individuals') i where b.user_key='user:'||lower(f.email) and i->>'id'=v.beetlelog_id and i->'bottleRecords'->0->>'feedBrand'='Excel feed' and i->'bottleRecords'->0->>'excelRegression'='keep') then raise exception 'FAIL linked source sync';end if;
 select * into v from public.kml_larvae where id=f.larva_id;old_records:=v.records;
 select data into original from public.beetlelog_data where user_key='user:'||lower(f.email);
 begin
  perform public.kml_import_excel(jsonb_build_array(
   jsonb_build_object('kind','larvae','id',v.id,'version',v.updated_at,'payload',jsonb_build_object('bottle_changes',jsonb_build_array(jsonb_build_object('index',0,'values',jsonb_build_object('weight','77'))))),
   jsonb_build_object('kind','larvae','id','ffffffff-ffff-4fff-8fff-ffffffffffff','payload',jsonb_build_object('line_id','ffffffff-ffff-4fff-8fff-ffffffffffff','number','FORBIDDEN'))));
  raise exception 'FAIL invalid second row accepted';
 exception when others then if sqlerrm not like '본인이 등록한 라인%' then raise;end if;end;
 if (select data from public.beetlelog_data where user_key='user:'||lower(f.email))<>original or (select records from public.kml_larvae where id=v.id)<>old_records then raise exception 'FAIL atomic rollback across apps';end if;
 begin
  perform public.kml_import_excel(jsonb_build_array(jsonb_build_object('kind','adults','id',child,'version',(select updated_at from public.kml_adults where id=child),'payload',jsonb_build_object('owner_id',gen_random_uuid()))));
  raise exception 'FAIL owner reassignment';
 exception when others then if sqlerrm not like '허용하지 않은 성충%' then raise;end if;end;
 begin
  perform public.kml_import_excel(jsonb_build_array(jsonb_build_object('kind','adults','id',parent,'version',(select updated_at from public.kml_adults where id=parent),'payload',jsonb_build_object('father_id',child))));
  raise exception 'FAIL parent cycle';
 exception when others then if sqlerrm not like '부모·자손 관계가 순환%' then raise;end if;end;
end;$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'email',email,'role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text,true) from excel_fixture;
set local role authenticated;
do $$declare v public.kml_larvae%rowtype;begin
 select * into v from public.kml_larvae where id=(select larva_id from excel_fixture);
 begin
  perform public.kml_import_excel(jsonb_build_array(jsonb_build_object('kind','larvae','id',v.id,'version',v.updated_at,'payload',jsonb_build_object('number','FOREIGN'))));
  raise exception 'FAIL foreign line write';
 exception when others then if sqlerrm not like '본인이 등록한 라인%' and sqlerrm not like '유충이 삭제되었거나 접근 권한%' then raise;end if;end;
end;$$;
reset role;
set local role anon;
do $$begin begin perform public.kml_import_excel('[]');raise exception 'FAIL anonymous import';exception when insufficient_privilege then null;end;end;$$;
reset role;
select 'PASS: adult/larva inserts and updates, forward parent references, photos/metadata/zero preservation, linked sync, stale versions, owner and identity guards, cycles and cross-app atomic rollback; rolled back' as result;
rollback;
