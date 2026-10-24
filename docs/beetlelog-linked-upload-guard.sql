CREATE OR REPLACE FUNCTION public.beetlelog_save_preserving_kml(p_data jsonb, p_baseline jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 v_uid uuid := (select auth.uid());
 v_mail text := lower(coalesce((select auth.jwt()->>'email'),''));
 v_key text;
 v_old jsonb;
 v_next jsonb;
 v_kind text;
 v_id text;
 v_server_item jsonb;
 v_local_item jsonb;
 v_base_item jsonb;
 v_merged_item jsonb;
 v_field text;
 v_field_names text[];
 v_rows jsonb;
 v_original jsonb;
 v_stored jsonb;
begin
 if v_uid is null or v_mail='' or p_data is null or jsonb_typeof(p_data)<>'object' then
   raise exception 'Signed-in account and valid data are required';
 end if;
 v_key:='user:'||v_mail;
 select data into v_old from public.beetlelog_data where user_key=v_key for update;
 if v_old is null then
   insert into public.beetlelog_data(user_key,data,updated_at)
   values (v_key,p_data,now()) on conflict (user_key) do nothing;
   select data into v_old from public.beetlelog_data where user_key=v_key for update;
 end if;
 v_next:=p_data;
 -- Never drop connected records during a stale device upload.
 for v_kind in select unnest(array['parents','lines','individuals']) loop
   v_field_names:=case v_kind when 'parents' then
     array['code','line','gen','status','sex','totalLength','eclosionDate','species','memo','photo','sireId','damId']
     when 'lines' then array['code','year','gen','isWild','species','memo','fatherId','motherId']
     else array['code','lineId','sex','status','memo','photo','flags','bottleRecords','pupation','eclosion'] end;
   for v_id in
      select beetlelog_id from public.kml_adults where beetlelog_owner_id=v_uid and beetlelog_id is not null
          and v_kind='parents'
      union all
      select beetlelog_id from public.kml_lines where beetlelog_owner_id=v_uid and beetlelog_id is not null
          and v_kind='lines'
      union all
      select beetlelog_id from public.kml_larvae where beetlelog_owner_id=v_uid and beetlelog_id is not null and v_kind='individuals'
   loop
     select x.value into v_server_item from jsonb_array_elements(coalesce(v_old->v_kind,'[]'::jsonb)) x where x.value->>'id'=v_id limit 1;
     if v_server_item is null then continue;end if;
     select x.value into v_local_item from jsonb_array_elements(coalesce(v_next->v_kind,'[]'::jsonb)) x where x.value->>'id'=v_id limit 1;
     if v_local_item is null then
        v_next:=jsonb_set(v_next,array[v_kind],coalesce(v_next->v_kind,'[]'::jsonb)||jsonb_build_array(v_server_item),true);
        continue;
     end if;
     select x.value into v_base_item from jsonb_array_elements(coalesce(p_baseline->v_kind,'[]'::jsonb)) x where x.value->>'id'=v_id limit 1;
     v_merged_item:=v_local_item;
     foreach v_field in array v_field_names loop
       if v_base_item is not null and v_local_item->v_field is distinct from v_base_item->v_field
          and v_server_item->v_field is distinct from v_base_item->v_field
          and v_local_item->v_field is distinct from v_server_item->v_field then
         raise exception '다른 앱에서 같은 기록을 수정했습니다. 백업 후 클라우드의 최신 내용을 확인하세요. (%, %)',v_kind,v_field;
       end if;
       -- Local value unchanged since baseline: server wins, including deletions.
       if v_base_item is null or v_local_item->v_field is not distinct from v_base_item->v_field then
         if v_server_item ? v_field then
           v_merged_item:=jsonb_set(v_merged_item,array[v_field],v_server_item->v_field,true);
         else
           v_merged_item:=v_merged_item-v_field;
         end if;
       end if;
     end loop;
     -- Retain all unrelated freeform fields, photos, and growth history from local.
     select jsonb_agg(case when x.value->>'id'=v_id then v_merged_item else x.value end order by x.ord)
       into v_rows
       from jsonb_array_elements(coalesce(v_next->v_kind,'[]'::jsonb)) with ordinality x(value,ord);
     v_next:=jsonb_set(v_next,array[v_kind],coalesce(v_rows,'[]'::jsonb),true);
   end loop;
 end loop;
 update public.beetlelog_data set data=v_next,updated_at=now() where user_key=v_key returning data into v_stored;
 if v_stored is null then raise exception 'Unable to save personal BeetleLog account data';end if;
 return jsonb_build_object('data',v_stored,'updated_at',now());
end;$function$

