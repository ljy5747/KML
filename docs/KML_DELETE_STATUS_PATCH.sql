-- Only authorized owners/admins may delete their KML records.
grant delete on public.kml_adults,public.kml_lines,public.kml_larvae to authenticated;
create policy kml_adults_delete on public.kml_adults for delete to authenticated
using ((select public.kml_authorized()) and (owner_id=(select auth.uid()) or (select public.kml_admin())));
create policy kml_lines_delete on public.kml_lines for delete to authenticated
using ((select public.kml_authorized()) and (created_by=(select auth.uid()) or (select public.kml_admin())));
create policy kml_larvae_delete on public.kml_larvae for delete to authenticated
using ((select public.kml_authorized()) and ((select public.kml_admin()) or exists(
select 1 from public.kml_lines l where l.id=line_id and l.created_by=(select auth.uid()))));
create or replace function public.kml_delete_record(p_kind text,p_id uuid,p_updated_at timestamptz)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_row record;v_count int:=0;
begin
 if auth.uid() is null or not public.kml_authorized() then raise exception '승인된 계정만 삭제할 수 있습니다.';end if;
 if p_kind='adult' then
  select * into v_row from public.kml_adults where id=p_id for update;
  if not found then raise exception '삭제할 성충을 찾을 수 없습니다.';end if;
  if v_row.owner_id is distinct from auth.uid() and not public.kml_admin() then raise exception '본인 소유 성충만 삭제할 수 있습니다.';end if;
  if p_updated_at is null or v_row.updated_at is distinct from p_updated_at then raise exception '다른 곳에서 수정된 기록입니다. 최신 내용을 확인한 뒤 다시 삭제하세요.';end if;
  if exists(select 1 from public.kml_lines where father_id=p_id or mother_id=p_id)
    or exists(select 1 from public.kml_adults where father_id=p_id or mother_id=p_id)
    or exists(select 1 from public.kml_comments where adult_id=p_id)
    or exists(select 1 from public.kml_transfers where adult_id=p_id) then
   raise exception '계통·라인·댓글·이동 기록이 연결된 성충은 삭제할 수 없습니다. 연결된 기록을 먼저 정리하세요.';
  end if;
  delete from public.kml_adults where id=p_id;
 elsif p_kind='line' then
  select * into v_row from public.kml_lines where id=p_id for update;
  if not found then raise exception '삭제할 라인을 찾을 수 없습니다.';end if;
  if v_row.created_by is distinct from auth.uid() and not public.kml_admin() then raise exception '본인이 만든 라인만 삭제할 수 있습니다.';end if;
  if p_updated_at is null or v_row.updated_at is distinct from p_updated_at then raise exception '다른 곳에서 수정된 기록입니다. 최신 내용을 확인한 뒤 다시 삭제하세요.';end if;
  delete from public.kml_larvae where line_id=p_id;
  get diagnostics v_count=row_count;
  delete from public.kml_lines where id=p_id;
 else raise exception '잘못된 삭제 요청입니다.';
 end if;
 return jsonb_build_object('deleted',true,'larvae',v_count);
end $$;
revoke all on function public.kml_delete_record(text,uuid,timestamptz) from public,anon;
grant execute on function public.kml_delete_record(text,uuid,timestamptz) to authenticated;

CREATE OR REPLACE FUNCTION public.kml_import_beetlelog(p_adult_ids text[] DEFAULT ARRAY[]::text[], p_line_ids text[] DEFAULT ARRAY[]::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_account uuid := (select auth.uid());
  v_raw jsonb;
  v_parent_data jsonb;
  v_larva_data jsonb;
  v_larva jsonb;
  v_target_line uuid;
  v_records jsonb;
  v_number text;
  v_larva_source_id text;
  v_imported_larvae int := 0;
  v_skipped_larvae int := 0;
  v_inserted int;
  v_line_data jsonb;
  v_ids text[] := coalesce(p_adult_ids,array[]::text[]);
  v_source_id text;
  v_line_id text;
  v_item jsonb;
  v_father uuid;
  v_mother uuid;
  v_current uuid;
  v_code text;
  v_name text;
  v_sex text;
  v_size numeric;
  v_date date;
  v_year int;
  v_imported_adults int := 0;
  v_imported_lines int := 0;
  v_skipped_adults int := 0;
  v_skipped_lines int := 0;
  v_issues jsonb := '[]'::jsonb;
  v_str text;
begin
  if v_account is null or not (select public.kml_authorized()) then
    raise exception 'KML account is not authorized';
  end if;
  if cardinality(coalesce(p_adult_ids,array[]::text[])) > 500
    or cardinality(coalesce(p_line_ids,array[]::text[])) > 500 then
    raise exception 'Too many selections';
  end if;
  if exists (select 1 from unnest(coalesce(p_adult_ids,array[]::text[]) || coalesce(p_line_ids,array[]::text[])) id
       where id is null or length(id)>160 or btrim(id)='') then
    raise exception 'Invalid original id';
  end if;
  select b.data into v_raw from public.beetlelog_data b
  where b.user_key = 'user:' || lower((select auth.jwt()->>'email'));
  if v_raw is null then
    raise exception 'No BeetleLog account data is saved for this Google account';
  end if;
  v_parent_data := case when jsonb_typeof(v_raw->'parents')='array' then v_raw->'parents' else '[]'::jsonb end;
  v_line_data := case when jsonb_typeof(v_raw->'lines')='array' then v_raw->'lines' else '[]'::jsonb end;
  v_larva_data := case when jsonb_typeof(v_raw->'individuals')='array' then v_raw->'individuals' else '[]'::jsonb end;
  -- A selected line also requests its two registered parents.
  for v_line_id in select distinct unnest(coalesce(p_line_ids,array[]::text[])) loop
    select x.value into v_item from jsonb_array_elements(v_line_data) x
    where x.value->>'id'=v_line_id limit 1;
    if v_item is null then
      v_skipped_lines:=v_skipped_lines+1;
      v_issues:=v_issues||jsonb_build_array('라인 원본을 찾지 못함: '||v_line_id);
      continue;
    end if;
    if nullif(v_item->>'fatherId','') is not null then
      v_ids:=array_append(v_ids,v_item->>'fatherId');
    end if;
    if nullif(v_item->>'motherId','') is not null then
      v_ids:=array_append(v_ids,v_item->>'motherId');
    end if;
  end loop;
  -- Insert selected adults and parents first; no BeetleLog JSON is modified.
  for v_source_id in select distinct unnest(v_ids) loop
    if v_source_id is null or btrim(v_source_id)='' then continue; end if;
    select x.value into v_item from jsonb_array_elements(v_parent_data) x
    where x.value->>'id'=v_source_id limit 1;
    if v_item is null then
      v_skipped_adults:=v_skipped_adults+1;
      v_issues:=v_issues||jsonb_build_array('성충 원본을 찾지 못함: '||v_source_id);
      continue;
    end if;
    if exists(select 1 from public.kml_adults
      where beetlelog_owner_id=v_account and beetlelog_id=v_source_id) then
      continue;
    end if;
    v_code:=left(btrim(coalesce(v_item->>'code','')),80);
    if v_code='' then
      v_skipped_adults:=v_skipped_adults+1;
      v_issues:=v_issues||jsonb_build_array('관리번호 없는 성충: '||v_source_id);
      continue;
    end if;
    if exists(select 1 from public.kml_adults where lower(code)=lower(v_code)) then
      v_skipped_adults:=v_skipped_adults+1;
      v_issues:=v_issues||jsonb_build_array('성충 관리번호 중복: '||v_code);
      continue;
    end if;
    v_str:=coalesce(v_item->>'sex','');
    v_sex:=case when v_str='M' or v_str like '%수컷%' or v_str like '%♂%' then 'M'
      when v_str='F' or v_str like '%암컷%' or v_str like '%♀%' then 'F' else null end;
    if v_sex is null then
      v_skipped_adults:=v_skipped_adults+1;
      v_issues:=v_issues||jsonb_build_array('성별 확인 필요: '||v_code);
      continue;
    end if;
    v_str:=btrim(coalesce(v_item->>'totalLength',''));
    v_size:=null;
    if v_str ~ '^[0-9]+([.][0-9]+)?$' then
      if length(v_str)<12 and v_str::numeric between 0 and 200 then v_size:=v_str::numeric; end if;
    end if;
    v_date:=null;
    v_str:=coalesce(v_item->>'eclosionDate','');
    if v_str ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$' then
      begin v_date:=v_str::date; exception when datetime_field_overflow then v_date:=null; end;
    end if;
    insert into public.kml_adults(
      code,lineage,sex,size,emerged,breeder_id,owner_id,source,status,note,
      species,beetlelog_owner_id,beetlelog_id,created_by,photo_url
    ) values(
      v_code,case when upper(btrim(coalesce(v_item->>'gen',''))) in ('WD','WILD','와일드') or coalesce(v_item->>'species','') ~* '(와일드|wild)' or btrim(coalesce(v_item->>'line','')) ~* '^(WD|wild|와일드)$' then 'Wild' else left(coalesce(nullif(btrim(v_item->>'line'),''),'미상'),120) end,
      v_sex,v_size,v_date,v_account,v_account,
      'BeetleLog 가져오기',case when v_item->>'status'='사망' then '사망' else '보유' end,left(coalesce(v_item->>'memo',''),3000),
      left(coalesce(v_item->>'species',''),200),v_account,v_source_id,v_account,
      case when length(coalesce(v_item->>'photo',''))<=1500000 and
       (v_item->>'photo' ~ '^data:image/(jpeg|png|webp);base64,' or v_item->>'photo' ~ '^https://')
       then v_item->>'photo' else '' end
    );
    v_imported_adults:=v_imported_adults+1;
  end loop;
  -- Preserve parent pointers when both original records exist in KML.
  for v_source_id in select distinct unnest(v_ids) loop
    select x.value into v_item from jsonb_array_elements(v_parent_data) x
    where x.value->>'id'=v_source_id limit 1;
    if v_item is null then continue; end if;
    select id into v_current from public.kml_adults where
       beetlelog_owner_id=v_account and beetlelog_id=v_source_id and created_by=v_account;
    if v_current is null then continue; end if;
    select id into v_father from public.kml_adults where
       beetlelog_owner_id=v_account and beetlelog_id=v_item->>'sireId' and sex='M';
    select id into v_mother from public.kml_adults where
       beetlelog_owner_id=v_account and beetlelog_id=v_item->>'damId' and sex='F';
    if v_father is not distinct from v_current then v_father:=null;end if;
    if v_mother is not distinct from v_current then v_mother:=null;end if;
    if v_father is not null and v_father is not distinct from v_mother then
      v_mother:=null;
    end if;
    update public.kml_adults set
      father_id=coalesce(father_id,v_father), mother_id=coalesce(mother_id,v_mother)
    where id=v_current and (father_id,mother_id) is distinct from (coalesce(father_id,v_father),coalesce(mother_id,v_mother));
  end loop;
  -- Lines require both parents. Existing same-name lines are never replaced.
  for v_line_id in select distinct unnest(coalesce(p_line_ids,array[]::text[])) loop
    select x.value into v_item from jsonb_array_elements(v_line_data) x
    where x.value->>'id'=v_line_id limit 1;
    if v_item is null then continue; end if;
    if exists(select 1 from public.kml_lines where
      beetlelog_owner_id=v_account and beetlelog_id=v_line_id) then continue; end if;
    v_name:=left(btrim(coalesce(v_item->>'code','')),80);
    if v_name='' then
      v_skipped_lines:=v_skipped_lines+1;
      v_issues:=v_issues||jsonb_build_array('라인명 없음: '||v_line_id);
      continue;
    end if;
    if exists(select 1 from public.kml_lines where lower(name)=lower(v_name)) then
      v_skipped_lines:=v_skipped_lines+1;
      v_issues:=v_issues||jsonb_build_array('라인명 중복: '||v_name);
      continue;
    end if;
    select id into v_father from public.kml_adults where
      beetlelog_owner_id=v_account and beetlelog_id=v_item->>'fatherId' and sex='M';
    select id into v_mother from public.kml_adults where
      beetlelog_owner_id=v_account and beetlelog_id=v_item->>'motherId' and sex='F';
    if v_father is null or v_mother is null or v_father=v_mother then
      v_skipped_lines:=v_skipped_lines+1;
      v_issues:=v_issues||jsonb_build_array('라인 부모 연결 불가: '||v_name);
      continue;
    end if;
    v_year:=null;
    v_str:=coalesce(v_item->>'year','');
    if v_str ~ '^(19|20|21)[0-9]{2}$' and v_str::int between 1980 and 2200 then
      v_year:=v_str::int;
    else
      v_str:=coalesce(v_item->>'setDate',v_item->>'pairDate','');
      if v_str ~ '^(19|20|21)[0-9]{2}-' then v_year:=left(v_str,4)::int;end if;
    end if;
    insert into public.kml_lines(
      name,father_id,mother_id,year,method,note,species,
      beetlelog_owner_id,beetlelog_id,created_by
    )values(
      v_name,v_father,v_mother,v_year,'BeetleLog 가져오기',
      left(coalesce(v_item->>'memo',''),2000),
      left(coalesce(v_item->>'species',''),200),
      v_account,v_line_id,v_account
    );
    v_imported_lines:=v_imported_lines+1;
  end loop;
  -- Revisit selected source lines, including already imported lines, to fill missing larvae.
  for v_line_id in select distinct unnest(coalesce(p_line_ids,array[]::text[])) loop
    select id into v_target_line from public.kml_lines
    where beetlelog_owner_id=v_account and beetlelog_id=v_line_id and created_by=v_account;
    if v_target_line is null then continue; end if;
    for v_larva in select x.value from jsonb_array_elements(v_larva_data) x
      where x.value->>'lineId'=v_line_id
    loop
      v_larva_source_id:=nullif(btrim(v_larva->>'id'),'');
      v_number:=btrim(coalesce(v_larva->>'code',''));
      if v_larva_source_id is null or length(v_larva_source_id)>160 or v_number='' or length(v_number)>80 then
        v_skipped_larvae:=v_skipped_larvae+1;
        v_issues:=v_issues||jsonb_build_array('유충 ID/관리번호 확인 필요: '||coalesce(v_larva->>'code',v_larva->>'id','미상'));
        continue;
      end if;
      if exists(select 1 from public.kml_larvae where beetlelog_owner_id=v_account and beetlelog_id=v_larva_source_id) then
        v_skipped_larvae:=v_skipped_larvae+1;continue;
      end if;
      if exists(select 1 from public.kml_larvae where line_id=v_target_line and number=v_number) then
        v_skipped_larvae:=v_skipped_larvae+1;
        v_issues:=v_issues||jsonb_build_array('유충 관리번호 중복: '||v_number);continue;
      end if;
      v_str:=coalesce(v_larva->>'sex','');
      v_sex:=case when v_str='M' or v_str like '%수컷%' or v_str like '%♂%' then 'M'
        when v_str='F' or v_str like '%암컷%' or v_str like '%♀%' then 'F' else 'U' end;
      -- Keep original order, all bottles, and original zero weights; retain full source data too.
      select coalesce(jsonb_agg(jsonb_build_array(
        coalesce(r.value->>'date',''),
        coalesce(nullif(r.value->>'feedBrand',''),r.value->>'feedType',''),
        coalesce(r.value->>'bottleSize',''),coalesce(r.value->>'weight','')
      ) order by r.ord),'[]'::jsonb) into v_records
      from jsonb_array_elements(case when jsonb_typeof(v_larva->'bottleRecords')='array'
        then v_larva->'bottleRecords' else '[]'::jsonb end) with ordinality r(value,ord);
      v_date:=null;
      v_str:=coalesce(v_larva->'eclosion'->>'date','');
      if v_str ~ '^(19|20|21)[0-9]{2}-[0-9]{2}-[0-9]{2}$' then
        begin v_date:=v_str::date; exception when datetime_field_overflow then v_date:=null; end;
      end if;
      v_size:=null;
      v_str:=btrim(coalesce(v_larva->'eclosion'->>'totalLength',v_larva->'eclosion'->>'size',''));
      if v_str ~ '^[0-9]+([.][0-9]+)?$' and length(v_str)<12 then
        if v_str::numeric between 0 and 200 then v_size:=v_str::numeric;end if;
      end if;
      insert into public.kml_larvae(line_id,number,sex,records,emerged,size,created_by,
        beetlelog_owner_id,beetlelog_id,source_data)
      values(v_target_line,v_number,v_sex,v_records,v_date,v_size,v_account,
        v_account,v_larva_source_id,v_larva)
      on conflict do nothing;
      get diagnostics v_inserted = row_count;
      v_imported_larvae:=v_imported_larvae+v_inserted;
      if v_inserted=0 then v_skipped_larvae:=v_skipped_larvae+1;end if;
    end loop;
  end loop;

  return jsonb_build_object(
    'imported_adults',v_imported_adults,
    'imported_lines',v_imported_lines,
    'imported_larvae',v_imported_larvae,
    'skipped_larvae',v_skipped_larvae,
    'skipped_adults',v_skipped_adults,
    'skipped_lines',v_skipped_lines,
    'issues',v_issues
  );
end
$function$
;
CREATE OR REPLACE FUNCTION public.kml_push_linked_record_to_beetlelog()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_mail text;
  v_userkey text;
  v_type text := tg_table_name;
  v_patch jsonb;
  v_parent_m text;
  v_parent_f text;
  v_target text;
begin
  if pg_trigger_depth()>1 or new.beetlelog_id is null or new.beetlelog_owner_id is null then return new; end if;
  if tg_op='UPDATE' and to_jsonb(new)=to_jsonb(old) then return new; end if;
  -- Restrict cross-account modifications: the source owner remains the sync target.
  select lower(email) into v_mail from auth.users where id=new.beetlelog_owner_id;
  if v_mail is null then return new;end if;
  v_userkey:='user:'||v_mail;
  if v_type='kml_adults' then
    select beetlelog_id into v_parent_f from public.kml_adults where id=new.father_id and beetlelog_owner_id=new.beetlelog_owner_id;
    select beetlelog_id into v_parent_m from public.kml_adults where id=new.mother_id and beetlelog_owner_id=new.beetlelog_owner_id;
    v_patch:=jsonb_build_object(
       'code',new.code,'line',new.lineage,'sex',case new.sex when 'M' then '수컷 ♂' else '암컷 ♀' end,
       'totalLength',coalesce(new.size::text,''),'eclosionDate',coalesce(new.emerged::text,''),
       'species',new.species,'memo',new.note,'photo',new.photo_url
    );
    if new.father_id is null then v_patch:=v_patch||jsonb_build_object('sireId','');
      elsif v_parent_f is not null then v_patch:=v_patch||jsonb_build_object('sireId',v_parent_f);end if;
    if new.mother_id is null then v_patch:=v_patch||jsonb_build_object('damId','');
      elsif v_parent_m is not null then v_patch:=v_patch||jsonb_build_object('damId',v_parent_m);end if;
    if new.status is distinct from old.status and (new.status='사망' or old.status='사망') then
      v_patch:=v_patch||jsonb_build_object('status',case when new.status='사망' then '사망' else '생존' end);
    end if;
    v_target:='parents';
  elsif v_type='kml_lines' then
    select beetlelog_id into v_parent_f from public.kml_adults where id=new.father_id and beetlelog_owner_id=new.beetlelog_owner_id;
    select beetlelog_id into v_parent_m from public.kml_adults where id=new.mother_id and beetlelog_owner_id=new.beetlelog_owner_id;
    v_patch:=jsonb_build_object(
      'code',new.name,'year',coalesce(new.year::text,''),'species',new.species,'memo',new.note
    );
    if v_parent_f is not null then v_patch:=v_patch||jsonb_build_object('fatherId',v_parent_f);end if;
    if v_parent_m is not null then v_patch:=v_patch||jsonb_build_object('motherId',v_parent_m);end if;
    v_target:='lines';
  else return new;end if;
  update public.beetlelog_data b
   set data=jsonb_set(b.data,array[v_target],(
      select jsonb_agg(
        case when x.value->>'id'=new.beetlelog_id then x.value||v_patch else x.value end
        order by x.ord)
      from jsonb_array_elements(coalesce(b.data->v_target,'[]'::jsonb)) with ordinality as x(value,ord)
   ),false),
   updated_at=now()
   where b.user_key=v_userkey
     and jsonb_typeof(b.data->v_target)='array'
     and exists (select 1 from jsonb_array_elements(b.data->v_target) x where x->>'id'=new.beetlelog_id)
     -- no need to write when nothing changed
     and exists (select 1 from jsonb_array_elements(b.data->v_target) x
                 where x->>'id'=new.beetlelog_id and x<>x||v_patch);
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.kml_pull_beetlelog_linked_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_uid uuid;
 v_old jsonb;
 v_new jsonb;
 v_record record;
 v_code text;
 v_sex text;
 v_length numeric;
 v_date date;
 v_lineage text;
 v_str text;
 v_father uuid;
 v_mother uuid;
 v_year integer;
begin
 if pg_trigger_depth()>1 or tg_op<>'UPDATE' or old.data=new.data
    or new.user_key not like 'user:%' then return new;end if;
 if not (select public.kml_authorized()) or lower(new.user_key)<>('user:'||lower(coalesce(auth.jwt()->>'email',''))) then return new;end if;
 v_uid:=(select auth.uid());
 if v_uid is null then return new;end if;
 -- Sync the changed linked parents only; skip removed items (deletion never cascades).
 for v_record in select id,beetlelog_id from public.kml_adults
   where beetlelog_owner_id=v_uid and owner_id=v_uid and beetlelog_id is not null
 loop
   select p.value into v_new from jsonb_array_elements(coalesce(new.data->'parents','[]'::jsonb)) p where p.value->>'id'=v_record.beetlelog_id limit 1;
   select p.value into v_old from jsonb_array_elements(coalesce(old.data->'parents','[]'::jsonb)) p where p.value->>'id'=v_record.beetlelog_id limit 1;
   if v_new is null or v_old is null or v_new=v_old then continue;end if;
   v_code:=left(btrim(coalesce(v_new->>'code','')),80);
   if v_code='' then continue;end if;
   v_str:=coalesce(v_new->>'sex','');
   v_sex:=case when v_str in ('M','수컷 ♂') or v_str like '%수컷%' or v_str like '%♂%' then 'M'
               when v_str in ('F','암컷 ♀') or v_str like '%암컷%' or v_str like '%♀%' then 'F' else null end;
   if v_sex is null then continue;end if;
   v_length:=null;v_str:=btrim(coalesce(v_new->>'totalLength',''));
   if v_str~'^[0-9]+([.][0-9]+)?$' and length(v_str)<12 then
     if v_str::numeric between 0 and 200 then v_length:=v_str::numeric;end if;
   end if;
   v_date:=null;v_str:=coalesce(v_new->>'eclosionDate','');
   if v_str ~ '^(19|20|21)[0-9]{2}-[0-9]{2}-[0-9]{2}$' then
     begin v_date:=v_str::date; exception when others then v_date:=null;end;
   end if;
   v_lineage:=left(coalesce(nullif(btrim(v_new->>'line'),''),nullif(btrim(v_new->>'species'),''),'미상'),120);
   select id into v_father from public.kml_adults where beetlelog_owner_id=v_uid and beetlelog_id=v_new->>'sireId' and sex='M';
   select id into v_mother from public.kml_adults where beetlelog_owner_id=v_uid and beetlelog_id=v_new->>'damId' and sex='F';
   if v_father=v_record.id then v_father:=null;end if;
   if v_mother=v_record.id then v_mother:=null;end if;
   begin
     update public.kml_adults set
       code=v_code, lineage=v_lineage,sex=v_sex,size=v_length,emerged=v_date,
       status=case when v_new->>'status'='사망' then '사망' when status='사망' then '보유' else status end,
       species=left(coalesce(v_new->>'species',''),200),
       note=left(coalesce(v_new->>'memo',''),3000),
       photo_url=case when length(coalesce(v_new->>'photo',''))<=1500000 and
        (coalesce(v_new->>'photo','')='' or v_new->>'photo' ~ '^data:image/(jpeg|png|webp);base64,' or v_new->>'photo' ~ '^https://')
        then coalesce(v_new->>'photo','') else photo_url end,
       father_id=case when nullif(v_new->>'sireId','') is null then null else coalesce(v_father,father_id) end,
       mother_id=case when nullif(v_new->>'damId','') is null then null else coalesce(v_mother,mother_id) end
     where id=v_record.id
       and (
         (code,lineage,sex,size,emerged,status,species,note,photo_url)
           is distinct from (v_code,v_lineage,v_sex,v_length,v_date,
             case when v_new->>'status'='사망' then '사망' when status='사망' then '보유' else status end,
             left(coalesce(v_new->>'species',''),200),left(coalesce(v_new->>'memo',''),3000),
             case when length(coalesce(v_new->>'photo',''))<=1500000 and
              (coalesce(v_new->>'photo','')='' or v_new->>'photo' ~ '^data:image/(jpeg|png|webp);base64,' or v_new->>'photo' ~ '^https://')
              then coalesce(v_new->>'photo','') else photo_url end)
         or father_id is distinct from
           (case when nullif(v_new->>'sireId','') is null then null else coalesce(v_father,father_id) end)
         or mother_id is distinct from
           (case when nullif(v_new->>'damId','') is null then null else coalesce(v_mother,mother_id) end)
       );
   exception when check_violation or unique_violation or foreign_key_violation then
     raise warning 'KML adult update rejected for invalid linked data %',v_record.id;
   end;
 end loop;
 for v_record in select id,beetlelog_id from public.kml_lines
   where beetlelog_owner_id=v_uid and created_by=v_uid and beetlelog_id is not null
 loop
   select l.value into v_new from jsonb_array_elements(coalesce(new.data->'lines','[]'::jsonb)) l where l.value->>'id'=v_record.beetlelog_id limit 1;
   select l.value into v_old from jsonb_array_elements(coalesce(old.data->'lines','[]'::jsonb)) l where l.value->>'id'=v_record.beetlelog_id limit 1;
   if v_new is null or v_old is null or v_new=v_old then continue;end if;
   v_code:=left(btrim(coalesce(v_new->>'code','')),80);
   if v_code='' then continue;end if;
   select id into v_father from public.kml_adults where beetlelog_owner_id=v_uid and beetlelog_id=v_new->>'fatherId' and sex='M';
   select id into v_mother from public.kml_adults where beetlelog_owner_id=v_uid and beetlelog_id=v_new->>'motherId' and sex='F';
   if v_father is null or v_mother is null or v_father=v_mother then continue;end if;
   v_year:=null;v_str:=coalesce(v_new->>'year','');
   if v_str ~ '^(19|20|21)[0-9]{2}$' and v_str::int between 1980 and 2200 then v_year:=v_str::int;end if;
   begin
     update public.kml_lines set name=v_code,year=v_year,
       father_id=v_father,mother_id=v_mother,
       species=left(coalesce(v_new->>'species',''),200),
       note=left(coalesce(v_new->>'memo',''),2000)
     where id=v_record.id and (name,year,father_id,mother_id,species,note)
       is distinct from (v_code,v_year,v_father,v_mother,left(coalesce(v_new->>'species',''),200),
                         left(coalesce(v_new->>'memo',''),2000));
   exception when check_violation or unique_violation or foreign_key_violation then
     raise warning 'KML line update rejected for invalid linked data %',v_record.id;
   end;
 end loop;
 return new;
end;
$function$
;
