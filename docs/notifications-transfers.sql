-- KML in-app inbox, recipient-accepted adult transfers and comment reactions.
begin;
create table if not exists public.kml_transfer_requests(
 id uuid primary key default gen_random_uuid(),adult_id uuid not null references public.kml_adults(id) on delete cascade,
 from_user uuid not null references public.kml_profiles(user_id),to_user uuid not null references public.kml_profiles(user_id),
 initiated_by uuid not null references public.kml_profiles(user_id),
 status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled','expired')),
 transfer_date date not null,note text not null default '' check(length(note)<=1000),
 created_at timestamptz not null default clock_timestamp(),resolved_at timestamptz,
 check(from_user<>to_user)
);
create unique index if not exists kml_transfer_one_pending on public.kml_transfer_requests(adult_id) where status='pending';
create index if not exists kml_transfer_from_idx on public.kml_transfer_requests(from_user,status,created_at desc);
create index if not exists kml_transfer_to_idx on public.kml_transfer_requests(to_user,status,created_at desc);
create table if not exists public.kml_notifications(
 id uuid primary key default gen_random_uuid(),recipient_id uuid not null references public.kml_profiles(user_id) on delete cascade,
 actor_id uuid references public.kml_profiles(user_id) on delete set null,
 actor_name text not null default '',actor_avatar text not null default '',
 kind text not null check(kind in ('transfer_request','transfer_accepted','transfer_declined','transfer_cancelled','transfer_expired','comment','comment_like')),
 adult_id uuid references public.kml_adults(id) on delete set null,adult_code text not null default '',
 comment_id uuid references public.kml_comments(id) on delete set null,
 request_id uuid references public.kml_transfer_requests(id) on delete set null,
 excerpt text not null default '',dedupe_key text not null,
 created_at timestamptz not null default clock_timestamp(),read_at timestamptz,
 unique(recipient_id,dedupe_key)
);
create index if not exists kml_notifications_feed_idx on public.kml_notifications(recipient_id,created_at desc,id desc);
create index if not exists kml_notifications_unread_idx on public.kml_notifications(recipient_id) where read_at is null;
create table if not exists public.kml_comment_likes(
 comment_id uuid not null references public.kml_comments(id) on delete cascade,
 user_id uuid not null references public.kml_profiles(user_id) on delete cascade,
 created_at timestamptz not null default clock_timestamp(),primary key(comment_id,user_id)
);
create index if not exists kml_comment_likes_user_idx on public.kml_comment_likes(user_id);
alter table public.kml_notifications enable row level security;
alter table public.kml_transfer_requests enable row level security;
alter table public.kml_comment_likes enable row level security;
revoke all on public.kml_notifications,public.kml_transfer_requests,public.kml_comment_likes from anon,authenticated;
grant select on public.kml_notifications,public.kml_transfer_requests,public.kml_comment_likes to authenticated;
grant update(read_at) on public.kml_notifications to authenticated;
grant insert,delete on public.kml_comment_likes to authenticated;
create policy kml_inbox_read on public.kml_notifications for select to authenticated using((select public.kml_authorized()) and recipient_id=(select auth.uid()));
create policy kml_inbox_mark on public.kml_notifications for update to authenticated using((select public.kml_authorized()) and recipient_id=(select auth.uid())) with check((select public.kml_authorized()) and recipient_id=(select auth.uid()));
create policy kml_requests_read on public.kml_transfer_requests for select to authenticated using((select public.kml_authorized()) and ((select auth.uid()) in (from_user,to_user,initiated_by)));
create policy kml_likes_read on public.kml_comment_likes for select to authenticated using((select public.kml_authorized()));
create policy kml_likes_add on public.kml_comment_likes for insert to authenticated with check((select public.kml_authorized()) and user_id=(select auth.uid()));
create policy kml_likes_remove on public.kml_comment_likes for delete to authenticated using((select public.kml_authorized()) and user_id=(select auth.uid()));

-- Only trigger functions and checked private request handlers create notifications.
create or replace function kml_internal.emit_notice(p_to uuid,p_actor uuid,p_kind text,p_adult uuid,p_comment uuid,p_request uuid,p_excerpt text,p_key text)
returns void language sql security invoker set search_path='' as $$
 insert into public.kml_notifications(recipient_id,actor_id,actor_name,actor_avatar,kind,adult_id,adult_code,comment_id,request_id,excerpt,dedupe_key)
 select p_to,p_actor,coalesce(p.nickname,'브리더'),coalesce(p.avatar_url,''),p_kind,p_adult,coalesce(a.code,''),p_comment,p_request,left(coalesce(p_excerpt,''),180),p_key
 from (select 1) seed left join public.kml_profiles p on p.user_id=p_actor left join public.kml_adults a on a.id=p_adult
 where p_to is not null and p_to is distinct from p_actor
 on conflict(recipient_id,dedupe_key) do nothing;
$$;
create or replace function kml_internal.comment_notice() returns trigger
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if not (select public.kml_authorized()) or new.member_id is distinct from (select auth.uid()) then raise exception 'Not authorized';end if;
 for target in select distinct x from public.kml_adults a cross join lateral unnest(array[a.owner_id,a.breeder_id]) x where a.id=new.adult_id and x is not null loop
  perform kml_internal.emit_notice(target,new.member_id,'comment',new.adult_id,new.id,null,new.body,'comment:'||new.id);
 end loop;return new;
end;$$;
create trigger kml_comment_notification after insert on public.kml_comments for each row execute function kml_internal.comment_notice();
create or replace function kml_internal.like_notice() returns trigger
language plpgsql security definer set search_path='' as $$
declare c public.kml_comments%rowtype;
begin
 if not (select public.kml_authorized()) or new.user_id is distinct from (select auth.uid()) then raise exception 'Not authorized';end if;
 select * into c from public.kml_comments where id=new.comment_id;
 perform kml_internal.emit_notice(c.member_id,new.user_id,'comment_like',c.adult_id,c.id,null,c.body,'like:'||c.id||':'||new.user_id);
 return new;
end;$$;
create trigger kml_like_notification after insert on public.kml_comment_likes for each row execute function kml_internal.like_notice();

create or replace function kml_internal.active_member(p_user uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.kml_profiles p join auth.users u on u.id=p.user_id join public.kml_allowed_emails a on a.email=lower(u.email) and a.active where p.user_id=p_user);
$$;
create or replace function kml_internal.transfer_candidates() returns table(user_id uuid,nickname text,avatar_url text)
language sql stable security definer set search_path='' as $$
 select p.user_id,p.nickname,p.avatar_url from public.kml_profiles p
 where (select auth.uid()) is not null and (select public.kml_authorized()) and kml_internal.active_member(p.user_id)
 order by p.nickname,p.user_id;
$$;
create or replace function public.kml_transfer_candidates() returns table(user_id uuid,nickname text,avatar_url text)
language sql stable security invoker set search_path='' as $$select * from kml_internal.transfer_candidates();$$;

create or replace function kml_internal.request_adult(p_adult uuid,p_to uuid,p_date date,p_note text,p_version timestamptz) returns uuid
language plpgsql security definer set search_path='' as $$
declare a public.kml_adults%rowtype;r uuid;
begin
 if (select auth.uid()) is null or not (select public.kml_authorized()) then raise exception 'Not authorized';end if;
 if p_date is null or p_date>(current_timestamp at time zone 'Asia/Seoul')::date then raise exception '이동일을 확인하세요.';end if;
 if length(coalesce(p_note,''))>1000 then raise exception '메모는 1000자 이내로 입력하세요.';end if;
 select * into a from public.kml_adults where id=p_adult for update;
 if not found then raise exception '성충을 찾을 수 없습니다.';end if;
 if a.owner_id is distinct from (select auth.uid()) and not (select public.kml_admin()) then raise exception '본인 성충만 보낼 수 있습니다.';end if;
 if p_version is null or p_version is distinct from a.updated_at then raise exception '성충 정보가 변경됐습니다. 최신 화면에서 다시 보내세요.';end if;
 if a.status='사망' then raise exception '사망한 성충은 보낼 수 없습니다.';end if;
 if p_to is null or p_to=a.owner_id or not kml_internal.active_member(p_to) then raise exception '받을 KML 승인 회원을 선택하세요.';end if;
 if exists(select 1 from public.kml_transfer_requests where adult_id=p_adult and status='pending') then raise exception '이미 수락을 기다리는 보내기가 있습니다.';end if;
 insert into public.kml_transfer_requests(adult_id,from_user,to_user,initiated_by,transfer_date,note)
 values(a.id,a.owner_id,p_to,(select auth.uid()),p_date,coalesce(p_note,'')) returning id into r;
 perform kml_internal.emit_notice(p_to,a.owner_id,'transfer_request',a.id,null,r,p_note,'request:'||r);
 return r;
end;$$;
create or replace function public.kml_request_adult_transfer(p_adult uuid,p_to uuid,p_date date,p_note text,p_version timestamptz) returns uuid
language sql security invoker set search_path='' as $$select kml_internal.request_adult(p_adult,p_to,p_date,p_note,p_version);$$;

create or replace function kml_internal.resolve_adult(p_request uuid,p_action text) returns text
language plpgsql security definer set search_path='' as $$
declare r public.kml_transfer_requests%rowtype;a public.kml_adults%rowtype;target uuid;new_state text;
begin
 if (select auth.uid()) is null or not (select public.kml_authorized()) then raise exception 'Not authorized';end if;
 if p_action not in ('accept','decline','cancel') or p_action is null then raise exception '잘못된 요청입니다.';end if;
 select * into r from public.kml_transfer_requests where id=p_request;
 if not found then raise exception '보내기 요청을 찾을 수 없습니다.';end if;
 -- Every path locks adult first, then request; concurrent accept/cancel cannot move twice.
 select * into a from public.kml_adults where id=r.adult_id for update;
 select * into r from public.kml_transfer_requests where id=p_request for update;
 if p_action in ('accept','decline') and r.to_user is distinct from (select auth.uid()) then raise exception '받는 회원만 수락하거나 거절할 수 있습니다.';end if;
 if p_action='cancel' and r.from_user is distinct from (select auth.uid()) and r.initiated_by is distinct from (select auth.uid()) then raise exception '보낸 회원만 취소할 수 있습니다.';end if;
 new_state:=case p_action when 'accept' then 'accepted' when 'decline' then 'declined' else 'cancelled' end;
 if r.status=new_state then return r.status;end if;
 if r.status<>'pending' then raise exception '이미 처리된 보내기 요청입니다.';end if;
 if a.owner_id is distinct from r.from_user or a.status='사망' then
  update public.kml_transfer_requests set status='expired',resolved_at=clock_timestamp() where id=r.id;
  return 'expired';
 end if;
 update public.kml_transfer_requests set status=new_state,resolved_at=clock_timestamp() where id=r.id;
 if p_action='accept' then
  update public.kml_adults set owner_id=r.to_user,status='보유' where id=a.id;
  insert into public.kml_transfers(adult_id,from_user,to_user,transfer_date,note,recorded_by) values(a.id,r.from_user,r.to_user,r.transfer_date,r.note,(select auth.uid()));
 end if;
 update public.kml_notifications set read_at=coalesce(read_at,clock_timestamp()) where request_id=r.id and recipient_id=(select auth.uid());
 target:=case when p_action='cancel' then r.to_user else r.from_user end;
 perform kml_internal.emit_notice(target,(select auth.uid()),'transfer_'||case p_action when 'accept' then 'accepted' when 'decline' then 'declined' else 'cancelled' end,a.id,null,r.id,r.note,'resolve:'||r.id);
 return new_state;
end;$$;
create or replace function public.kml_resolve_adult_transfer(p_request uuid,p_action text) returns text
language sql security invoker set search_path='' as $$select kml_internal.resolve_adult(p_request,p_action);$$;

-- Old immediate-transfer endpoints must not bypass the recipient's acceptance.
create or replace function kml_internal.transfer_adult(p_adult_id uuid,p_to_user uuid,p_date date,p_note text default '') returns void
language plpgsql security definer set search_path='' as $$
declare version timestamptz;
begin
 if (select auth.uid()) is null or not (select public.kml_authorized()) then raise exception 'Not authorized';end if;
 select updated_at into version from public.kml_adults where id=p_adult_id;
 perform kml_internal.request_adult(p_adult_id,p_to_user,p_date,p_note,version);
end;$$;
create or replace function kml_internal.expire_adult_requests() returns trigger
language plpgsql security definer set search_path='' as $$
declare r record;
begin
 if new.owner_id is distinct from old.owner_id or new.status='사망' then
  for r in update public.kml_transfer_requests set status='expired',resolved_at=clock_timestamp() where adult_id=new.id and status='pending' returning * loop
   perform kml_internal.emit_notice(r.to_user,null,'transfer_expired',new.id,null,r.id,'성충의 소유자 또는 상태가 변경되었습니다.','expire:'||r.id);
  end loop;
 end if;return new;
end;$$;
create trigger kml_expire_pending_transfers after update of owner_id,status on public.kml_adults for each row execute function kml_internal.expire_adult_requests();

create or replace function kml_internal.inbox(p_before timestamptz,p_before_id uuid,p_limit integer) returns jsonb
language sql stable security invoker set search_path='' as $$
 with page as(select * from public.kml_notifications where recipient_id=(select auth.uid()) and (p_before is null or (created_at,id)<(p_before,p_before_id)) order by created_at desc,id desc limit greatest(1,least(coalesce(p_limit,30),50)))
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page) order by created_at desc,id desc) from page),'[]'::jsonb),
 'unread',(select count(*) from public.kml_notifications where recipient_id=(select auth.uid()) and read_at is null));
$$;
create or replace function public.kml_inbox(p_before timestamptz default null,p_before_id uuid default null,p_limit integer default 30) returns jsonb
language sql stable security invoker set search_path='' as $$select kml_internal.inbox(p_before,p_before_id,p_limit);$$;
create or replace function public.kml_comment_reactions(p_adult uuid) returns table(comment_id uuid,likes bigint,liked boolean)
language sql stable security invoker set search_path='' as $$
 select c.id,count(l.user_id),coalesce(bool_or(l.user_id=(select auth.uid())),false) from public.kml_comments c left join public.kml_comment_likes l on l.comment_id=c.id where c.adult_id=p_adult group by c.id;
$$;
create or replace function kml_internal.toggle_comment_like(p_comment uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare was_liked boolean;amount bigint;
begin
 if (select auth.uid()) is null or not (select public.kml_authorized()) then raise exception 'Not authorized';end if;
 -- Advisory lock avoids requiring UPDATE permission on someone else's comment.
 perform pg_advisory_xact_lock(hashtextextended(p_comment::text,1729));
 if not exists(select 1 from public.kml_comments where id=p_comment) then raise exception '댓글이 삭제되었습니다.';end if;
 delete from public.kml_comment_likes where comment_id=p_comment and user_id=(select auth.uid());
 was_liked:=found;
 if not was_liked then insert into public.kml_comment_likes(comment_id,user_id) values(p_comment,(select auth.uid()));end if;
 select count(*) into amount from public.kml_comment_likes where comment_id=p_comment;
 return jsonb_build_object('comment_id',p_comment,'likes',amount,'liked',not was_liked);
end;$$;
create or replace function public.kml_toggle_comment_like(p_comment uuid) returns jsonb
language sql security invoker set search_path='' as $$select kml_internal.toggle_comment_like(p_comment);$$;


create or replace function public.kml_mark_notifications_read(p_id uuid default null) returns integer
language plpgsql security invoker set search_path='' as $$
declare amount integer;
begin
 if not (select public.kml_authorized()) then raise exception 'Not authorized';end if;
 update public.kml_notifications set read_at=clock_timestamp() where recipient_id=(select auth.uid()) and read_at is null and (p_id is null or id=p_id);
 get diagnostics amount=row_count;return amount;
end;$$;
revoke all on function public.kml_mark_notifications_read(uuid) from public,anon;
grant execute on function public.kml_mark_notifications_read(uuid) to authenticated;

revoke all on function kml_internal.emit_notice(uuid,uuid,text,uuid,uuid,uuid,text,text),kml_internal.comment_notice(),kml_internal.like_notice(),kml_internal.active_member(uuid),kml_internal.expire_adult_requests() from public,anon,authenticated;
revoke all on function kml_internal.transfer_candidates(),kml_internal.request_adult(uuid,uuid,date,text,timestamptz),kml_internal.resolve_adult(uuid,text),kml_internal.inbox(timestamptz,uuid,integer),kml_internal.toggle_comment_like(uuid) from public,anon,authenticated;
grant execute on function kml_internal.transfer_candidates(),kml_internal.request_adult(uuid,uuid,date,text,timestamptz),kml_internal.resolve_adult(uuid,text),kml_internal.inbox(timestamptz,uuid,integer),kml_internal.toggle_comment_like(uuid) to authenticated;
revoke all on function public.kml_transfer_candidates(),public.kml_request_adult_transfer(uuid,uuid,date,text,timestamptz),public.kml_resolve_adult_transfer(uuid,text),public.kml_inbox(timestamptz,uuid,integer),public.kml_comment_reactions(uuid),public.kml_toggle_comment_like(uuid) from public,anon;
grant execute on function public.kml_transfer_candidates(),public.kml_request_adult_transfer(uuid,uuid,date,text,timestamptz),public.kml_resolve_adult_transfer(uuid,text),public.kml_inbox(timestamptz,uuid,integer),public.kml_comment_reactions(uuid),public.kml_toggle_comment_like(uuid) to authenticated;
CREATE OR REPLACE FUNCTION public.kml_visible_breeder_labels()
 RETURNS TABLE(user_id uuid, nickname text, avatar_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$;
  select p.user_id, p.nickname, p.avatar_url
  from public.kml_profiles p
  where (select public.kml_authorized()) and (
    kml_internal.active_member(p.user_id)
    or p.user_id = (select auth.uid())
    or exists(select 1 from public.kml_adults a
              where a.breeder_id=p.user_id or a.owner_id=p.user_id or a.created_by=p.user_id)
    or exists(select 1 from public.kml_lines l where l.created_by=p.user_id)
    or exists(select 1 from public.kml_comments c where c.member_id=p.user_id)
    or exists(select 1 from public.kml_transfers t where t.from_user=p.user_id or t.to_user=p.user_id)
  )
  order by p.nickname, p.user_id;
$function$;


create index if not exists kml_transfer_initiator_idx on public.kml_transfer_requests(initiated_by,status,created_at desc);
create index if not exists kml_transfer_adult_idx on public.kml_transfer_requests(adult_id);
create index if not exists kml_notifications_request_idx on public.kml_notifications(request_id,recipient_id) where request_id is not null;
create index if not exists kml_notifications_adult_idx on public.kml_notifications(adult_id) where adult_id is not null;
create index if not exists kml_notifications_comment_idx on public.kml_notifications(comment_id) where comment_id is not null;
create index if not exists kml_notifications_actor_idx on public.kml_notifications(actor_id) where actor_id is not null;


commit;

notify pgrst, 'reload schema';
