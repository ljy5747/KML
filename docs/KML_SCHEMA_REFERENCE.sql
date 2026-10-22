-- KML v0.2: additive schema only, does not modify BeetleLog or battle tables.
-- Approved Google email allowlist starts empty; bootstrap your first admin with a SQL INSERT.
create table if not exists public.kml_allowed_emails (
  email text primary key check (email=lower(btrim(email))),
  role text not null default 'member' check (role in ('admin','member')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.kml_allowed_emails enable row level security;
revoke all on public.kml_allowed_emails from anon, authenticated;
grant select on public.kml_allowed_emails to authenticated;
-- SELECT allowlist limited to own signed-in email; admin changes managed in SQL dashboard for v0.2.
create policy "kml_whitelist_self_read" on public.kml_allowed_emails for select to authenticated
using (email = lower((select auth.jwt()->>'email')));

create or replace function public.kml_authorized()
returns boolean language sql stable security invoker set search_path = '' as $$
  select (select auth.uid()) is not null
  and exists(
    select 1 from public.kml_allowed_emails a
    where a.email = lower((select auth.jwt()->>'email'))
      and a.active
      and (coalesce((select auth.jwt()->'app_metadata'->>'provider'),'')='google'
           or coalesce((select auth.jwt()->'app_metadata'->'providers'),'[]'::jsonb) ? 'google')
  );
$$;
create or replace function public.kml_admin()
returns boolean language sql stable security invoker set search_path = '' as $$
  select (select public.kml_authorized())
    and exists (select 1 from public.kml_allowed_emails a
    where a.email=lower((select auth.jwt()->>'email')) and a.active and a.role='admin');
$$;
revoke all on function public.kml_authorized() from public, anon;
revoke all on function public.kml_admin() from public, anon;
grant execute on function public.kml_authorized() to authenticated;
grant execute on function public.kml_admin() to authenticated;

create table if not exists public.kml_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check(length(trim(nickname)) between 1 and 32),
  intro text not null default '' check(length(intro)<=500),
  avatar_url text not null default '',
  created_at timestamptz not null default now()
);
alter table public.kml_profiles enable row level security;
create policy "kml_profile_view" on public.kml_profiles for select to authenticated using ((select public.kml_authorized()));
create policy "kml_profile_create_self" on public.kml_profiles for insert to authenticated
with check ((select public.kml_authorized()) and user_id=(select auth.uid()));
create policy "kml_profile_edit_self" on public.kml_profiles for update to authenticated
using ((select public.kml_authorized()) and user_id=(select auth.uid()))
with check ((select public.kml_authorized()) and user_id=(select auth.uid()));
revoke all on public.kml_profiles from anon,authenticated;
grant select on public.kml_profiles to authenticated;
grant insert(user_id,nickname,intro,avatar_url) on public.kml_profiles to authenticated;
grant update(nickname,intro,avatar_url) on public.kml_profiles to authenticated;

create table if not exists public.kml_adults (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check(length(trim(code)) between 1 and 80),
  lineage text not null check(length(trim(lineage)) between 1 and 120),
  sex text not null check(sex in ('M','F')),
  size numeric(6,2) check(size is null or size between 0 and 200),
  emerged date,
  breeder_id uuid references public.kml_profiles(user_id),
  owner_id uuid references public.kml_profiles(user_id),
  father_id uuid references public.kml_adults(id),
  mother_id uuid references public.kml_adults(id),
  source text not null default '자체 우화',
  status text not null default '보유',
  note text not null default '' check(length(note)<=3000),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  constraint kml_adult_distinct_parents check (father_id is distinct from mother_id),
  constraint kml_adult_not_own_parent check(id is distinct from father_id and id is distinct from mother_id)
);
alter table public.kml_adults enable row level security;
create policy "kml_adults_read" on public.kml_adults for select to authenticated using ((select public.kml_authorized()));
create policy "kml_adults_create" on public.kml_adults for insert to authenticated with check ((select public.kml_authorized()) and created_by=(select auth.uid()));
create policy "kml_adults_edit" on public.kml_adults for update to authenticated
using ((select public.kml_authorized())) with check ((select public.kml_authorized()));
revoke all on public.kml_adults from anon,authenticated;
grant select,insert on public.kml_adults to authenticated;
grant update(code,lineage,sex,size,emerged,breeder_id,father_id,mother_id,source,status,note) on public.kml_adults to authenticated;

create table if not exists public.kml_lines (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check(length(trim(name)) between 1 and 80),
  father_id uuid not null references public.kml_adults(id),
  mother_id uuid not null references public.kml_adults(id),
  year integer check(year between 1980 and 2200),
  method text not null default '',
  note text not null default '' check(length(note)<=2000),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  constraint kml_lines_not_same_parent check(father_id<>mother_id)
);
alter table public.kml_lines enable row level security;
create policy "kml_lines_read" on public.kml_lines for select to authenticated using ((select public.kml_authorized()));
create policy "kml_lines_create" on public.kml_lines for insert to authenticated with check ((select public.kml_authorized()) and created_by=(select auth.uid()));
create policy "kml_lines_edit" on public.kml_lines for update to authenticated using ((select public.kml_authorized())) with check ((select public.kml_authorized()));
revoke all on public.kml_lines from anon,authenticated;
grant select,insert on public.kml_lines to authenticated;
grant update(name,father_id,mother_id,year,method,note) on public.kml_lines to authenticated;

create table if not exists public.kml_larvae (
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null references public.kml_lines(id),
  number text not null check(length(trim(number)) between 1 and 80),
  sex text check(sex in ('M','F','U')),
  records jsonb not null default '[]'::jsonb check(jsonb_typeof(records)='array'),
  emerged date,
  size numeric(6,2),
  created_by uuid not null default auth.uid() references auth.users(id),
  unique(line_id,number)
);
alter table public.kml_larvae enable row level security;
create policy "kml_larvae_read" on public.kml_larvae for select to authenticated using ((select public.kml_authorized()));
create policy "kml_larvae_create" on public.kml_larvae for insert to authenticated with check ((select public.kml_authorized()) and created_by=(select auth.uid()));
create policy "kml_larvae_edit" on public.kml_larvae for update to authenticated using ((select public.kml_authorized())) with check ((select public.kml_authorized()));
revoke all on public.kml_larvae from anon,authenticated;
grant select,insert on public.kml_larvae to authenticated;
grant update(line_id,number,sex,records,emerged,size) on public.kml_larvae to authenticated;

create table if not exists public.kml_comments (
  id uuid primary key default gen_random_uuid(),
  adult_id uuid not null references public.kml_adults(id),
  member_id uuid not null default auth.uid() references public.kml_profiles(user_id),
  body text not null check(length(trim(body)) between 1 and 1500),
  created_at timestamptz not null default now()
);
alter table public.kml_comments enable row level security;
create policy "kml_comments_read" on public.kml_comments for select to authenticated using ((select public.kml_authorized()));
create policy "kml_comments_create" on public.kml_comments for insert to authenticated with check ((select public.kml_authorized()) and member_id=(select auth.uid()));
create policy "kml_comments_delete_own" on public.kml_comments for delete to authenticated
using ((select public.kml_authorized()) and (member_id=(select auth.uid()) or (select public.kml_admin())));
revoke all on public.kml_comments from anon,authenticated;
grant select,insert,delete on public.kml_comments to authenticated;

create table if not exists public.kml_transfers (
  id uuid primary key default gen_random_uuid(),
  adult_id uuid not null references public.kml_adults(id),
  from_user uuid references public.kml_profiles(user_id),
  to_user uuid not null references public.kml_profiles(user_id),
  transfer_date date not null,
  note text not null default '',
  recorded_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.kml_transfers enable row level security;
create policy "kml_transfers_read" on public.kml_transfers for select to authenticated using ((select public.kml_authorized()));
-- Transfer history is recorded through a controlled RPC rather than client INSERT.
revoke all on public.kml_transfers from anon,authenticated;
grant select on public.kml_transfers to authenticated;

-- Controlled transactional ownership transfer. No INSERT/UPDATE on transfer history is granted to browser users.
-- SECURITY DEFINER is used only for this strictly-scoped mutation; the function enforces
-- live membership, current ownership/admin role, destination and date, with fixed search_path.
create or replace function public.kml_transfer_adult(p_adult_id uuid,p_to_user uuid,p_date date,p_note text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare v_old uuid;
begin
  if (select auth.uid()) is null or not (select public.kml_authorized()) then raise exception 'Not authorized'; end if;
  if p_date is null or p_date>current_date then raise exception 'Invalid transfer date'; end if;
  if length(coalesce(p_note,''))>1000 then raise exception 'Note too long'; end if;
  if not exists (select 1 from public.kml_profiles where user_id=p_to_user) then raise exception 'Unknown recipient'; end if;
  select owner_id into v_old from public.kml_adults where id=p_adult_id for update;
  if not found then raise exception 'Adult not found'; end if;
  if v_old is distinct from (select auth.uid()) and not (select public.kml_admin()) then raise exception 'Only current owner or admin may transfer'; end if;
  if v_old is not distinct from p_to_user then raise exception 'Already owned by recipient'; end if;
  update public.kml_adults set owner_id=p_to_user where id=p_adult_id;
  insert into public.kml_transfers(adult_id,from_user,to_user,transfer_date,note,recorded_by)
    values(p_adult_id,v_old,p_to_user,p_date,coalesce(p_note,''),(select auth.uid()));
end;$$;
revoke all on function public.kml_transfer_adult(uuid,uuid,date,text) from public,anon;
grant execute on function public.kml_transfer_adult(uuid,uuid,date,text) to authenticated;