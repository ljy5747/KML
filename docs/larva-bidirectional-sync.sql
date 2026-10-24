-- KML / BeetleLog: linked larva records, atomic updates and immutable link identities.
-- Apply as project owner. Existing larva data is not rewritten on installation.
begin;
alter table public.kml_larvae add column if not exists updated_at timestamptz not null default clock_timestamp();
create trigger kml_larvae_touch_update before update on public.kml_larvae
 for each row execute function public.kml_touch_updated_at();
-- Clients may edit content, never another account's source identity or the owning line.
revoke update on public.kml_larvae from authenticated;
grant update(number,sex,records,emerged,size,source_data) on public.kml_larvae to authenticated;

create or replace function kml_internal.larva_date(v text) returns date
language plpgsql immutable set search_path='' as $$
begin
 if coalesce(v,'') !~ '^\d{4}-\d{2}-\d{2}$' then return null;end if;
 return v::date;
exception when others then return null;
end;$$;
create or replace function kml_internal.larva_size(v text) returns numeric
language plpgsql immutable set search_path='' as $$
begin
 if coalesce(v,'') !~ '^[0-9]+([.][0-9]+)?$' or length(v)>12 then return null;end if;
 if v::numeric between 0 and 200 then return v::numeric;end if;
 return null;
end;$$;

create or replace function kml_internal.push_larva() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_key text;v_doc jsonb;v_items jsonb;v_bottles jsonb;v_source jsonb;v_line text;
begin
 if pg_trigger_depth()>1 or new.beetlelog_id is null then return new;end if;
 if not (select public.kml_authorized()) or not exists(select 1 from public.kml_lines l where l.id=new.line_id and (l.created_by=(select auth.uid()) or (select public.kml_admin()))) then raise exception 'Not authorized';end if;
 select 'user:'||lower(email) into v_key from auth.users where id=new.beetlelog_owner_id;
 select beetlelog_id into v_line from public.kml_lines where id=new.line_id and beetlelog_owner_id=new.beetlelog_owner_id;
 select data into v_doc from public.beetlelog_data where user_key=v_key for update;
 if v_doc is null or v_line is null or not exists(select 1 from jsonb_array_elements(v_doc->'individuals') x where x->>'id'=new.beetlelog_id and x->>'lineId'=v_line) then
   raise exception 'BeetleLog 원본 개체 또는 연결 라인이 없습니다. 원본을 확인한 뒤 다시 시도하세요.';
 end if;
 select x into v_source from jsonb_array_elements(v_doc->'individuals') x where x->>'id'=new.beetlelog_id;
 -- Keep per-bottle IDs, photos, flags and other source fields from the edited source data.
 select coalesce(jsonb_agg(coalesce(new.source_data->'bottleRecords'->(r.ord::int-1),'{}'::jsonb)||jsonb_build_object(
   'id',coalesce(nullif(new.source_data->'bottleRecords'->(r.ord::int-1)->>'id',''),gen_random_uuid()::text),
   'date',coalesce(r.value->>0,''),'feedBrand',coalesce(r.value->>1,''),
   'bottleSize',coalesce(r.value->>2,''),'weight',coalesce(r.value->>3,'')
 ) order by r.ord),'[]'::jsonb) into v_bottles from jsonb_array_elements(new.records) with ordinality r(value,ord);
 v_source:=v_source||new.source_data||jsonb_build_object('id',new.beetlelog_id,'lineId',v_line,'code',new.number,
  'sex',case new.sex when 'M' then '수컷 ♂' when 'F' then '암컷 ♀' else '미구분' end,'bottleRecords',v_bottles,
  'eclosion',(case when jsonb_typeof(new.source_data->'eclosion')='object' then new.source_data->'eclosion' else '{}'::jsonb end)||jsonb_build_object('date',coalesce(new.emerged::text,''),'totalLength',coalesce(new.size::text,'')));
 select jsonb_agg(case when x.value->>'id'=new.beetlelog_id then v_source else x.value end order by x.ord) into v_items
 from jsonb_array_elements(v_doc->'individuals') with ordinality x(value,ord);
 update public.beetlelog_data set data=jsonb_set(data,'{individuals}',v_items),updated_at=clock_timestamp() where user_key=v_key;
 return new;
end;$$;
create trigger kml_larvae_push_to_beetlelog after update on public.kml_larvae
 for each row when ((old.number,old.sex,old.records,old.emerged,old.size,old.source_data) is distinct from (new.number,new.sex,new.records,new.emerged,new.size,new.source_data)) execute function kml_internal.push_larva();

create or replace function kml_internal.pull_larvae() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_uid uuid;v_new jsonb;v_old jsonb;v_line uuid;v_id uuid;v_sex text;v_records jsonb;v_number text;
begin
 if pg_trigger_depth()>1 or old.data is not distinct from new.data then return new;end if;
 v_uid:=(select auth.uid());
 if v_uid is null or not (select public.kml_authorized()) or lower(new.user_key)<>('user:'||lower(coalesce(auth.jwt()->>'email',''))) then return new;end if;
 if jsonb_typeof(new.data->'individuals')<>'array' then return new;end if;
 for v_new in select value from jsonb_array_elements(new.data->'individuals') loop
   select value into v_old from jsonb_array_elements(case when jsonb_typeof(old.data->'individuals')='array' then old.data->'individuals' else '[]'::jsonb end) where value->>'id'=v_new->>'id';
   if v_new is not distinct from v_old then continue;end if;
   select id into v_line from public.kml_lines where created_by=v_uid and beetlelog_owner_id=v_uid and beetlelog_id=v_new->>'lineId';
   -- Deletions and moves to unlinked lines never destroy KML history.
   if v_line is null then continue;end if;
   v_number:=btrim(coalesce(v_new->>'code',''));
   if v_number='' or length(v_number)>80 or coalesce(v_new->>'id','')='' or length(v_new->>'id')>160 then raise exception 'KML 유충 관리번호 또는 ID를 확인하세요.';end if;
   v_sex:=case when v_new->>'sex'='M' or v_new->>'sex' like '%수컷%' or v_new->>'sex' like '%♂%' then 'M' when v_new->>'sex'='F' or v_new->>'sex' like '%암컷%' or v_new->>'sex' like '%♀%' then 'F' else 'U' end;
   select coalesce(jsonb_agg(jsonb_build_array(coalesce(r.value->>'date',''),coalesce(nullif(r.value->>'feedBrand',''),r.value->>'feedType',''),coalesce(r.value->>'bottleSize',''),coalesce(r.value->>'weight','')) order by r.ord),'[]'::jsonb) into v_records
   from jsonb_array_elements(case when jsonb_typeof(v_new->'bottleRecords')='array' then v_new->'bottleRecords' else '[]'::jsonb end) with ordinality r(value,ord);
   select id into v_id from public.kml_larvae where beetlelog_owner_id=v_uid and beetlelog_id=v_new->>'id';
   if v_id is not null then
     update public.kml_larvae set line_id=v_line,number=v_number,sex=v_sex,records=v_records,
       emerged=kml_internal.larva_date(v_new->'eclosion'->>'date'),size=kml_internal.larva_size(coalesce(v_new->'eclosion'->>'totalLength',v_new->'eclosion'->>'size')),source_data=v_new
     where id=v_id;
   elsif v_old is null then
     insert into public.kml_larvae(line_id,number,sex,records,emerged,size,source_data,created_by,beetlelog_id,beetlelog_owner_id)
     values(v_line,v_number,v_sex,v_records,kml_internal.larva_date(v_new->'eclosion'->>'date'),kml_internal.larva_size(v_new->'eclosion'->>'totalLength'),v_new,v_uid,v_new->>'id',v_uid);
   end if;
 end loop;
 return new;
end;$$;
create trigger beetlelog_larva_updates_to_kml after update on public.beetlelog_data for each row execute function kml_internal.pull_larvae();
-- Monotonic server version for compare-and-swap uploads from BeetleLog.
create trigger beetlelog_touch_update before update on public.beetlelog_data for each row execute function public.kml_touch_updated_at();
revoke all on function kml_internal.push_larva(),kml_internal.pull_larvae(),kml_internal.larva_date(text),kml_internal.larva_size(text) from public,anon,authenticated;
revoke execute on function public.kml_pull_beetlelog_linked_changes(),public.kml_push_linked_record_to_beetlelog() from public,anon,authenticated;
commit;
