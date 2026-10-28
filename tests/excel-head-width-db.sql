-- Exercise the real authenticated import and linked sync, then undo every write.
begin;
create temporary table head_width_fixture as
select v.id as larva_id,l.id as line_id,l.created_by as owner_id,u.email
from public.kml_lines l join auth.users u on u.id=l.created_by
join public.kml_allowed_emails a on a.email=lower(u.email) and a.active
left join public.kml_larvae v on v.line_id=l.id and v.beetlelog_owner_id=l.created_by
order by v.beetlelog_id nulls last limit 1;
grant select on head_width_fixture to authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text,true) from head_width_fixture;
set local role authenticated;
do $$
declare f record;new_id uuid:=gen_random_uuid();v public.kml_larvae%rowtype;value text;
begin
 select * into strict f from head_width_fixture;
 perform public.kml_import_excel(jsonb_build_array(jsonb_build_object('kind','larvae','id',new_id,'payload',jsonb_build_object('line_id',f.line_id,'number','__HEAD_WIDTH_'||new_id,'source_patch',jsonb_build_object('headWidth','0')))));
 if not exists(select 1 from public.kml_larvae where id=new_id and source_data->>'headWidth'='0' and records='[]'::jsonb) then raise exception 'FAIL independent head width and zero';end if;
 foreach value in array array['10.5',''] loop
  select * into v from public.kml_larvae where id=new_id;
  perform public.kml_import_excel(jsonb_build_array(jsonb_build_object('kind','larvae','id',v.id,'version',v.updated_at,'payload',jsonb_build_object('source_patch',jsonb_build_object('headWidth',value)))));
  if (select source_data->>'headWidth' from public.kml_larvae where id=new_id) is distinct from value then raise exception 'FAIL head width update/clear';end if;
 end loop;
 select * into v from public.kml_larvae where id=new_id;
 begin
  perform public.kml_import_excel(jsonb_build_array(jsonb_build_object('kind','larvae','id',v.id,'version',v.updated_at,'payload',jsonb_build_object('source_patch',jsonb_build_object('headWidth','-1')))));
  raise exception 'FAIL negative head width accepted';
 exception when others then if sqlerrm not like '두폭은 0 이상의 숫자%' then raise;end if;end;
 if f.larva_id is not null then
  select * into v from public.kml_larvae where id=f.larva_id;
  perform public.kml_import_excel(jsonb_build_array(jsonb_build_object('kind','larvae','id',v.id,'version',v.updated_at,'payload',jsonb_build_object('source_patch',jsonb_build_object('headWidth','11.7')))));
  if not exists(select 1 from public.beetlelog_data b cross join lateral jsonb_array_elements(b.data->'individuals') i where b.user_key='user:'||lower(f.email) and i->>'id'=v.beetlelog_id and i->>'headWidth'='11.7') then raise exception 'FAIL linked head width sync';end if;
 end if;
end;$$;
reset role;
select 'PASS: head width without bottle dates, zero, decimal, clear, negative rejection and linked sync; all changes rolled back' as result;
rollback;
