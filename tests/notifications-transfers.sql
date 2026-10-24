-- Real authorization/RLS/trigger checks. All synthetic accounts and events roll back.
begin;
create temporary table notify_fixture(role text,id uuid,email text);
insert into notify_fixture values('sender',gen_random_uuid(),'kml-notify-sender@invalid.example'),('receiver',gen_random_uuid(),'kml-notify-receiver@invalid.example'),('other',gen_random_uuid(),'kml-notify-other@invalid.example');
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) select id,email,'{"provider":"google","providers":["google"]}'::jsonb,'{}'::jsonb from notify_fixture;
insert into public.kml_allowed_emails(email,role,active) select email,'member',true from notify_fixture;
insert into public.kml_profiles(user_id,nickname) select id,'테스트 '||role from notify_fixture;
create temporary table notify_records(adult uuid,request uuid,comment uuid);
insert into notify_records(adult) select gen_random_uuid();
insert into public.kml_adults(id,code,lineage,sex,breeder_id,owner_id,created_by) select n.adult,'__NOTIFY_REGRESSION__','테스트','M',f.id,f.id,f.id from notify_records n cross join notify_fixture f where f.role='sender';
grant select,update on notify_records to authenticated;grant select on notify_fixture to authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text,true) from notify_fixture where role='sender';
set local role authenticated;
do $$declare req uuid;v timestamptz;begin
 select updated_at into v from public.kml_adults where id=(select adult from notify_records);
 req:=public.kml_request_adult_transfer((select adult from notify_records),(select id from notify_fixture where role='receiver'),current_date,'test memo',v);
 update notify_records set request=req;
 if (select owner_id from public.kml_adults where id=(select adult from notify_records))<>(select auth.uid()) then raise exception 'FAIL moved before acceptance';end if;
 if exists(select 1 from public.kml_notifications) then raise exception 'FAIL recipient inbox leaked to sender';end if;
 begin
  perform public.kml_request_adult_transfer((select adult from notify_records),(select id from notify_fixture where role='other'),current_date,'duplicate',v);
  raise exception 'FAIL multiple pending requests';
 exception when others then if sqlerrm not like '이미 수락%' then raise;end if;end;
 begin
  update public.kml_transfer_requests set to_user=(select auth.uid()) where id=req;
  raise exception 'FAIL direct request update';
 exception when insufficient_privilege then null;end;
end;$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text,true) from notify_fixture where role='other';
set local role authenticated;
do $$begin
 if exists(select 1 from public.kml_transfer_requests) then raise exception 'FAIL outsider request read';end if;
 begin perform public.kml_resolve_adult_transfer((select request from notify_records),'accept');raise exception 'FAIL outsider acceptance';
 exception when others then if sqlerrm not like '받는 회원만%' then raise;end if;end;
end;$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text,true) from notify_fixture where role='receiver';
set local role authenticated;
do $$declare result text;notice uuid;begin
 if (public.kml_inbox()->>'unread')::int<>1 then raise exception 'FAIL request notification unread count';end if;
 select id into notice from public.kml_notifications where kind='transfer_request';
 begin update public.kml_notifications set actor_name='spoof' where id=notice;raise exception 'FAIL notification spoof';exception when insufficient_privilege then null;end;
 result:=public.kml_resolve_adult_transfer((select request from notify_records),'accept');
 if result<>'accepted' or (select owner_id from public.kml_adults where id=(select adult from notify_records))<>(select auth.uid()) then raise exception 'FAIL acceptance ownership';end if;
 perform public.kml_resolve_adult_transfer((select request from notify_records),'accept');
 if (select count(*) from public.kml_transfers where adult_id=(select adult from notify_records))<>1 then raise exception 'FAIL duplicate acceptance';end if;
 if (public.kml_inbox()->>'unread')::int<>0 then raise exception 'FAIL accepted request read state';end if;
 if (select breeder_id from public.kml_adults where id=(select adult from notify_records))<>(select id from notify_fixture where role='sender') then raise exception 'FAIL breeder identity changed';end if;
end;$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text,true) from notify_fixture where role='other';
set local role authenticated;
insert into public.kml_comments(adult_id,member_id,body) select adult,(select auth.uid()),'notification comment <script>unsafe</script>' from notify_records returning id;
update notify_records set comment=(select id from public.kml_comments where adult_id=(select adult from notify_records));
do $$begin if exists(select 1 from public.kml_notifications where kind='comment') then raise exception 'FAIL self comment notification';end if;end;$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text,true) from notify_fixture where role='receiver';
set local role authenticated;
do $$declare result jsonb;begin
 if (select count(*) from public.kml_notifications where kind='comment' and comment_id=(select comment from notify_records))<>1 then raise exception 'FAIL owner comment notification';end if;
 result:=public.kml_toggle_comment_like((select comment from notify_records));
 if not (result->>'liked')::boolean or (result->>'likes')::int<>1 then raise exception 'FAIL like count';end if;
 perform public.kml_toggle_comment_like((select comment from notify_records));
 perform public.kml_toggle_comment_like((select comment from notify_records));
end;$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text,true) from notify_fixture where role='other';
set local role authenticated;
do $$begin
 if (select count(*) from public.kml_notifications where kind='comment_like')<>1 then raise exception 'FAIL relike notification spam';end if;
 perform public.kml_toggle_comment_like((select comment from notify_records));
 if (select count(*) from public.kml_notifications where kind='comment_like')<>1 then raise exception 'FAIL self-like notification';end if;
 if not exists(select 1 from public.kml_comment_reactions((select adult from notify_records)) where likes=2 and liked) then raise exception 'FAIL aggregate reaction';end if;
end;$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text,true) from notify_fixture where role='sender';
set local role authenticated;
do $$begin
 if (select count(*) from public.kml_notifications where kind='transfer_accepted')<>1 then raise exception 'FAIL sender acceptance notification';end if;
 if (select count(*) from public.kml_notifications where kind='comment')<>1 then raise exception 'FAIL breeder comment notification';end if;
 perform public.kml_mark_notifications_read();
 if (public.kml_inbox()->>'unread')::int<>0 then raise exception 'FAIL mark all read';end if;
end;$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text,true) from notify_fixture where role='receiver';
set local role authenticated;
do $$declare r uuid;v timestamptz;begin
 select updated_at into v from public.kml_adults where id=(select adult from notify_records);
 r:=public.kml_request_adult_transfer((select adult from notify_records),(select id from notify_fixture where role='sender'),current_date,'cancel',v);
 perform public.kml_resolve_adult_transfer(r,'cancel');
 if (select owner_id from public.kml_adults where id=(select adult from notify_records))<>(select auth.uid()) then raise exception 'FAIL cancel moved ownership';end if;
 r:=public.kml_request_adult_transfer((select adult from notify_records),(select id from notify_fixture where role='sender'),current_date,'decline',v);
 update notify_records set request=r;
end;$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text,true) from notify_fixture where role='sender';
set local role authenticated;
do $$begin
 perform public.kml_resolve_adult_transfer((select request from notify_records),'decline');
 if (select owner_id from public.kml_adults where id=(select adult from notify_records))=(select auth.uid()) then raise exception 'FAIL decline moved ownership';end if;
end;$$;
reset role;
-- The legacy endpoint must also request consent; stale versions and changed adults stay safe.
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text,true) from notify_fixture where role='receiver';
set local role authenticated;
do $$declare v timestamptz;r uuid;begin
 select updated_at into v from public.kml_adults where id=(select adult from notify_records);
 begin
  perform public.kml_request_adult_transfer((select adult from notify_records),(select id from notify_fixture where role='sender'),current_date,'stale',v-interval '1 second');
  raise exception 'FAIL stale send accepted';
 exception when others then if sqlerrm not like '성충 정보가 변경%' then raise;end if;end;
 perform public.kml_transfer_adult((select adult from notify_records),(select id from notify_fixture where role='sender'),current_date,'legacy');
 if (select owner_id from public.kml_adults where id=(select adult from notify_records))<>(select auth.uid()) then raise exception 'FAIL old endpoint bypassed acceptance';end if;
 select id into r from public.kml_transfer_requests where adult_id=(select adult from notify_records) and status='pending';
 if r is null then raise exception 'FAIL old endpoint missing consent request';end if;
 update public.kml_adults set status='사망' where id=(select adult from notify_records);
 if (select status from public.kml_transfer_requests where id=r)<>'expired' then raise exception 'FAIL invalidated request not expired';end if;
end;$$;
reset role;
-- Generate older inbox entries to exercise stable cursor pagination.
select kml_internal.emit_notice((select id from notify_fixture where role='other'),(select id from notify_fixture where role='sender'),'comment',(select adult from notify_records),(select comment from notify_records),null,'page '||i,'page:'||i) from generate_series(1,35) i;
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text,true) from notify_fixture where role='other';
set local role authenticated;
do $$declare first_page jsonb;second_page jsonb;last_item jsonb;begin
 first_page:=public.kml_inbox(null,null,30);if jsonb_array_length(first_page->'items')<>30 then raise exception 'FAIL first page';end if;
 last_item:=first_page->'items'->29;
 second_page:=public.kml_inbox((last_item->>'created_at')::timestamptz,(last_item->>'id')::uuid,30);
 if jsonb_array_length(second_page->'items')<>6 then raise exception 'FAIL second page';end if;
 if exists(select 1 from jsonb_array_elements(first_page->'items') a join jsonb_array_elements(second_page->'items') b on a->>'id'=b->>'id') then raise exception 'FAIL duplicate page items';end if;
end;$$;
reset role;
-- Logged-out clients cannot read or invoke any notification endpoint.
set local role anon;
do $$begin
 begin perform public.kml_inbox();raise exception 'FAIL anonymous inbox';exception when insufficient_privilege then null;end;
end;$$;
reset role;
select 'PASS: notification privacy/read state, consent-based atomic transfer, replay/outsider rejection, cancel/decline, comment/like delivery, no self/relike spam, cursor pagination; rolled back' as result;
rollback;
