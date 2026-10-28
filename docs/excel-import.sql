-- Atomic, owner-scoped Excel writes. Existing triggers keep linked records in sync.
begin;
create or replace function kml_internal.import_excel(p_items jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare item jsonb;p jsonb;v_id uuid;version timestamptz;a public.kml_adults%rowtype;v public.kml_larvae%rowtype;
 fresh boolean;key text;source jsonb;bottles jsonb;change jsonb;idx integer;patch jsonb;r jsonb;v_records jsonb;
 made integer:=0;edited integer:=0;line_owner uuid;father uuid;mother uuid;
begin
 if (select auth.uid()) is null or not (select public.kml_authorized()) then raise exception 'Not authorized';end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 500 then raise exception '한 번에 1~500개체를 저장할 수 있습니다.';end if;
 if octet_length(p_items::text)>2000000 then raise exception '입력 데이터가 너무 큽니다. 파일을 나누어 주세요.';end if;
 if exists(select 1 from jsonb_array_elements(p_items) x group by x->>'id' having count(*)>1) then raise exception '파일에 중복 개체가 있습니다.';end if;
 -- Match the lock order of source uploads before touching KML rows.
 perform 1 from public.beetlelog_data where user_key='user:'||lower(coalesce(auth.jwt()->>'email','')) for update;
 for item in select value from jsonb_array_elements(p_items) order by value->>'kind',value->>'id' loop
  v_id:=(item->>'id')::uuid;version:=nullif(item->>'version','')::timestamptz;p:=item->'payload';
  if v_id is null or jsonb_typeof(p) is distinct from 'object' then raise exception '잘못된 개체 데이터입니다.';end if;
  if item->>'kind'='adults' then
   if exists(select 1 from jsonb_object_keys(p) k where k not in ('code','lineage','generation','sex','size','emerged','breeder_id','father_id','mother_id','source','status','note')) then raise exception '허용하지 않은 성충 항목입니다.';end if;
   select * into a from public.kml_adults where id=v_id for update;fresh:=not found;
   if fresh and version is not null then raise exception '성충이 삭제되었거나 접근 권한이 없습니다.';end if;
   if not fresh and (a.owner_id is distinct from (select auth.uid()) or version is null or a.updated_at is distinct from version) then raise exception '성충이 다른 앱에서 변경되었거나 본인 보유 개체가 아닙니다. 파일을 다시 확인하세요.';end if;
   if fresh then a:=jsonb_populate_record(null::public.kml_adults,jsonb_build_object('generation','','source','우화','status','보유','note','','breeder_id',(select auth.uid())));end if;
   a:=jsonb_populate_record(a,p);
   if a.sex not in ('M','F') or a.sex is null or a.source is null or a.status is null or a.source not in ('우화','입양','채집') or a.status not in ('보유','분양','사망') then raise exception '성별·상태·입수 경로를 확인하세요.';end if;
   if exists(select 1 from public.kml_adults where lower(code)=lower(a.code) and id<>v_id) then raise exception '이미 사용 중인 성충 관리번호입니다: %',a.code;end if;
   if fresh then
    insert into public.kml_adults(id,code,lineage,generation,sex,size,emerged,breeder_id,owner_id,source,status,note,created_by)
    values(v_id,a.code,a.lineage,coalesce(a.generation,''),a.sex,a.size,a.emerged,a.breeder_id,(select auth.uid()),a.source,a.status,coalesce(a.note,''),(select auth.uid()));made:=made+1;
   else
    update public.kml_adults set code=a.code,lineage=a.lineage,generation=a.generation,sex=a.sex,size=a.size,emerged=a.emerged,breeder_id=a.breeder_id,source=a.source,status=a.status,note=a.note where id=v_id;edited:=edited+1;
   end if;
  elsif item->>'kind'='larvae' then
   if exists(select 1 from jsonb_object_keys(p) k where k not in ('line_id','number','sex','emerged','size','source_patch','bottle_changes')) then raise exception '허용하지 않은 유충 항목입니다.';end if;
   select * into v from public.kml_larvae where id=v_id for update;fresh:=not found;
   if fresh and version is not null then raise exception '유충이 삭제되었거나 접근 권한이 없습니다.';end if;
   if not fresh and (version is null or v.updated_at is distinct from version) then raise exception '유충이 다른 앱에서 변경되었습니다. 파일을 다시 확인하세요.';end if;
   if fresh then v:=jsonb_populate_record(null::public.kml_larvae,jsonb_build_object('line_id',p->'line_id','sex','U','records','[]'::jsonb,'source_data',jsonb_build_object('status','유충')));end if;
   if p?'line_id' and v.line_id is distinct from (p->>'line_id')::uuid then raise exception '유충의 라인은 엑셀로 이동할 수 없습니다.';end if;
   select created_by into line_owner from public.kml_lines where id=v.line_id;
   if line_owner is distinct from (select auth.uid()) then raise exception '본인이 등록한 라인의 유충만 넣을 수 있습니다.';end if;
   v:=jsonb_populate_record(v,p-array['source_patch','bottle_changes']);
   if v.sex not in ('M','F','U') or v.sex is null or (v.size is not null and (v.size<0 or v.size>200)) then raise exception '유충 성별·체장을 확인하세요.';end if;
   source:=case when jsonb_typeof(v.source_data)='object' then v.source_data else '{}'::jsonb end;patch:=coalesce(p->'source_patch','{}'::jsonb);
   if jsonb_typeof(patch) is distinct from 'object' or exists(select 1 from jsonb_object_keys(patch) k where k not in ('status','memo','pupation','headWidth')) then raise exception '잘못된 유충 추가 정보입니다.';end if;
   if patch?'headWidth' and (jsonb_typeof(patch->'headWidth') is distinct from 'string' or (patch->>'headWidth'<>'' and (patch->>'headWidth' !~ '^[0-9]+([.][0-9]+)?$' or (patch->>'headWidth')::numeric>1000000))) then raise exception '두폭은 0 이상의 숫자여야 합니다.';end if;
   if patch?'pupation' then
    if jsonb_typeof(patch->'pupation') is distinct from 'object' or exists(select 1 from jsonb_object_keys(patch->'pupation') k where k not in ('prepupaDate','pupaDate','pupaWeight')) then raise exception '용화 정보를 확인하세요.';end if;
    source:=jsonb_set(source,'{pupation}',(case when jsonb_typeof(source->'pupation')='object' then source->'pupation' else '{}'::jsonb end)||(patch->'pupation'));
   end if;
   if patch?'status' and coalesce(patch->>'status','') not in ('유충','사육중','용화','우화','분양','사망') then raise exception '유충 상태를 확인하세요.';end if;
   source:=source||(patch-'pupation');
   if jsonb_array_length(v.records)>0 then
    select jsonb_agg((case when jsonb_typeof(source->'bottleRecords'->(x.ord::int-1))='object' then source->'bottleRecords'->(x.ord::int-1) else '{}'::jsonb end)||jsonb_build_object('date',coalesce(x.value->>0,''),'feedBrand',coalesce(x.value->>1,''),'bottleSize',coalesce(x.value->>2,''),'weight',coalesce(x.value->>3,'')) order by x.ord) into bottles from jsonb_array_elements(v.records) with ordinality x(value,ord);
   else bottles:=case when jsonb_typeof(source->'bottleRecords')='array' then source->'bottleRecords' else '[]'::jsonb end;end if;
   if jsonb_typeof(coalesce(p->'bottle_changes','[]'::jsonb)) is distinct from 'array' then raise exception '병별 기록을 확인하세요.';end if;
   for change in select value from jsonb_array_elements(coalesce(p->'bottle_changes','[]'::jsonb)) order by (value->>'index')::int loop
    idx:=(change->>'index')::int;patch:=change->'values';
    if idx is null or idx<0 or idx>60 or idx>jsonb_array_length(bottles) or jsonb_typeof(patch) is distinct from 'object' then raise exception '병 기록은 앞 번호부터 빈칸 없이 입력하세요.';end if;
    if exists(select 1 from jsonb_object_keys(patch) k where k not in ('date','feedBrand','feedType','bottleSize','weight','headWidth','pudding','instar','nextDate','memo')) then raise exception '잘못된 병 기록 항목입니다.';end if;
    r:=(case when jsonb_typeof(bottles->idx)='object' then bottles->idx else '{}'::jsonb end)||patch;
    if coalesce(r->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception '병별 날짜를 입력하세요.';end if;
    perform (r->>'date')::date;
    foreach key in array array['weight','headWidth'] loop
     if coalesce(r->>key,'')<>'' and (r->>key !~ '^[0-9]+([.][0-9]+)?$') then raise exception '무게·두폭은 0 이상의 숫자여야 합니다.';end if;
    end loop;
    if nullif(r->>'id','') is null then r:=r||jsonb_build_object('id',gen_random_uuid()::text);end if;
    bottles:=jsonb_set(bottles,array[idx::text],r,true);
   end loop;
   select coalesce(jsonb_agg(jsonb_build_array(coalesce(x->>'date',''),coalesce(nullif(x->>'feedBrand',''),x->>'feedType',''),coalesce(x->>'bottleSize',''),coalesce(x->>'weight',''))),'[]'::jsonb) into v_records from jsonb_array_elements(bottles) x;
   source:=source||jsonb_build_object('code',v.number,'sex',case v.sex when 'M' then '수컷 ♂' when 'F' then '암컷 ♀' else '미구분' end,'bottleRecords',bottles);
   if p?'emerged' or p?'size' then
    patch:=case when jsonb_typeof(source->'eclosion')='object' then source->'eclosion' else '{}'::jsonb end;
    if p?'emerged' then patch:=patch||jsonb_build_object('date',coalesce(v.emerged::text,''));end if;
    if p?'size' then patch:=patch||jsonb_build_object('totalLength',coalesce(v.size::text,''));end if;
    source:=jsonb_set(source,'{eclosion}',patch);
   end if;
   if fresh then
    insert into public.kml_larvae(id,line_id,number,sex,records,emerged,size,source_data,created_by) values(v_id,v.line_id,v.number,v.sex,v_records,v.emerged,v.size,source,(select auth.uid()));made:=made+1;
   else
    update public.kml_larvae set number=v.number,sex=v.sex,records=v_records,emerged=v.emerged,size=v.size,source_data=source where id=v_id;edited:=edited+1;
   end if;
  else raise exception '지원하지 않는 엑셀 종류입니다.';end if;
 end loop;
 -- Parent links are applied after all adult rows exist; preserve unspecified links.
 for item in select value from jsonb_array_elements(p_items) where value->>'kind'='adults' loop
  p:=item->'payload';v_id:=(item->>'id')::uuid;
  if p?'father_id' or p?'mother_id' then
   select * into a from public.kml_adults where id=v_id;
   father:=case when p?'father_id' then (p->>'father_id')::uuid else a.father_id end;mother:=case when p?'mother_id' then (p->>'mother_id')::uuid else a.mother_id end;
   update public.kml_adults set father_id=father,mother_id=mother where id=v_id;
  end if;
 end loop;
 if exists(select 1 from public.kml_adults c left join public.kml_adults f on f.id=c.father_id left join public.kml_adults m on m.id=c.mother_id where ((c.father_id is not null and f.sex<>'M') or (c.mother_id is not null and m.sex<>'F')) and exists(select 1 from jsonb_array_elements(p_items) z where z->>'kind'='adults' and (z->>'id')::uuid in (c.id,c.father_id,c.mother_id))) then raise exception '부·모 개체의 성별을 확인하세요.';end if;
 if exists(with recursive ancestry(id,path,cycle) as (
  select (x->>'id')::uuid,array[(x->>'id')::uuid],false from jsonb_array_elements(p_items) x where x->>'kind'='adults'
  union all select edge.parent,ancestry.path||edge.parent,edge.parent=any(ancestry.path) from ancestry join public.kml_adults node on node.id=ancestry.id cross join lateral unnest(array[node.father_id,node.mother_id]) edge(parent) where edge.parent is not null and not ancestry.cycle
 )select 1 from ancestry where cycle) then raise exception '부모·자손 관계가 순환합니다.';end if;
 return jsonb_build_object('inserted',made,'updated',edited);
end;$$;
create or replace function public.kml_import_excel(p_items jsonb) returns jsonb language sql security invoker set search_path='' as $$select kml_internal.import_excel(p_items);$$;
revoke all on function kml_internal.import_excel(jsonb),public.kml_import_excel(jsonb) from public,anon;
grant execute on function kml_internal.import_excel(jsonb),public.kml_import_excel(jsonb) to authenticated;
commit;
notify pgrst,'reload schema';
