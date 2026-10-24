-- Database integration regression. Everything, including source edits, is rolled back.
begin;
create temporary table kml_sync_fixture as
 select l.id as line_id,l.created_by as owner_id,l.beetlelog_id as source_line,u.email
 from public.kml_lines l join auth.users u on u.id=l.created_by
 join public.kml_allowed_emails a on a.email=lower(u.email) and a.active
 where l.beetlelog_owner_id=l.created_by and l.beetlelog_id is not null limit 1;
do $$begin if not exists(select 1 from kml_sync_fixture)then raise exception 'A linked line fixture is required';end if;end;$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'email',email,'app_metadata',jsonb_build_object('provider','google'),'role','authenticated')::text,true) from kml_sync_fixture;
grant select on kml_sync_fixture to authenticated;
set local role authenticated;
do $$
declare f record;v uuid;stamp timestamptz;src jsonb;n int;baseline jsonb;local_doc jsonb;
begin
 select * into f from kml_sync_fixture;
 update public.beetlelog_data set data=jsonb_set(data,'{individuals}',coalesce(data->'individuals','[]')||jsonb_build_array(jsonb_build_object(
  'id','__kml_sync_regression__','lineId',f.source_line,'code','__KML_SYNC_TEST__','sex','수컷 ♂','status','유충','memo','preserve',
  'flags',jsonb_build_array('keep'),'photo','keep-photo',
  'bottleRecords',jsonb_build_array(jsonb_build_object('id','bottle-one','date','2026-07-01','feedBrand','A','feedType','균사','weight','0','headWidth','0','bottleSize','800','photo','keep-bottle','pudding',false)),
  'pupation',null,'eclosion',null))) where user_key='user:'||lower(f.email);
 select id,updated_at into v,stamp from public.kml_larvae where beetlelog_owner_id=f.owner_id and beetlelog_id='__kml_sync_regression__';
 if v is null then raise exception 'FAIL source insert did not create KML larva';end if;
 select data into baseline from public.beetlelog_data where user_key='user:'||lower(f.email);
 update public.kml_larvae set records='[["2026-07-01","B","1400","0"]]'::jsonb,
  source_data=jsonb_set(source_data,'{status}','"사망"') where id=v and updated_at=stamp;
 select x into src from public.beetlelog_data b cross join lateral jsonb_array_elements(b.data->'individuals') x where b.user_key='user:'||lower(f.email) and x->>'id'='__kml_sync_regression__';
 if src->'bottleRecords'->0->>'feedBrand'<>'B' or src->'bottleRecords'->0->>'weight'<>'0' or src->'bottleRecords'->0->>'photo'<>'keep-bottle' or src->'flags'->>0<>'keep' or src->>'status'<>'사망' then raise exception 'FAIL KML push fields/metadata';end if;
 -- Older BeetleLog runtimes still use the guarded RPC; a stale upload must preserve server edits.
 local_doc:=jsonb_set(baseline,'{individuals}',(select jsonb_agg(case when x->>'id'='__kml_sync_regression__' then jsonb_set(x,'{memo}','"local edit"') else x end) from jsonb_array_elements(baseline->'individuals') x));
 perform public.beetlelog_save_preserving_kml(local_doc,baseline);
 select x into src from public.beetlelog_data b cross join lateral jsonb_array_elements(b.data->'individuals') x where b.user_key='user:'||lower(f.email) and x->>'id'='__kml_sync_regression__';
 if src->>'memo'<>'local edit' or src->>'status'<>'사망' or src->'bottleRecords'->0->>'feedBrand'<>'B' then raise exception 'FAIL legacy stale upload guard';end if;
 begin
   local_doc:=jsonb_set(baseline,'{individuals}',(select jsonb_agg(case when x->>'id'='__kml_sync_regression__' then jsonb_set(x,'{status}','"분양"') else x end) from jsonb_array_elements(baseline->'individuals') x));
   perform public.beetlelog_save_preserving_kml(local_doc,baseline);
   raise exception 'FAIL concurrent same-field edit accepted';
 exception when others then if sqlerrm not like '다른 앱에서 같은 기록%' then raise;end if;end;
 update public.kml_larvae set number='STALE' where id=v and updated_at=stamp;
 get diagnostics n=row_count;if n<>0 then raise exception 'FAIL stale version accepted';end if;
 update public.beetlelog_data b set data=jsonb_set(data,'{individuals}',(select jsonb_agg(case when x->>'id'='__kml_sync_regression__' then jsonb_set(jsonb_set(x,'{bottleRecords,0,weight}','"22.5"'),'{code}','"__KML_SYNC_RENAMED__"') else x end) from jsonb_array_elements(b.data->'individuals') x)) where user_key='user:'||lower(f.email);
 if not exists(select 1 from public.kml_larvae where id=v and number='__KML_SYNC_RENAMED__' and records->0->>3='22.5') then raise exception 'FAIL source pull';end if;
 begin
   update public.kml_larvae set beetlelog_owner_id=gen_random_uuid() where id=v;
   raise exception 'FAIL identity update allowed';
 exception when insufficient_privilege then null;end;
end;$$;
reset role;
-- A different authorized account may view the record but cannot edit it.
select set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'email',a.email,'app_metadata',jsonb_build_object('provider','google'),'role','authenticated')::text,true) from public.kml_allowed_emails a where a.active and a.role<>'admin' limit 1;
set local role authenticated;
do $$declare n int;begin
 if (select auth.uid())=(select owner_id from kml_sync_fixture) then raise exception 'Different non-admin fixture required';end if;
 update public.kml_larvae set number='FORBIDDEN' where beetlelog_id='__kml_sync_regression__';get diagnostics n=row_count;
 if n<>0 then raise exception 'FAIL foreign owner write';end if;
end;$$;
reset role;
select 'PASS: authenticated two-way sync, new source larva, zero weight, metadata preservation, stale version and foreign-owner rejection; rolled back' as result;
rollback;
