begin;
alter table public.kml_adults add column if not exists emerged_year integer;
alter table public.kml_adults add constraint kml_adults_emerged_year_check check(emerged_year between 1000 and 9999);
create or replace function kml_internal.sync_adult_year() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.emerged is not null then new.emerged_year:=extract(year from new.emerged)::integer;end if;
 return new;
end;$$;
revoke all on function kml_internal.sync_adult_year() from public,anon;
create trigger kml_adults_sync_emergence_year before insert or update of emerged,emerged_year
on public.kml_adults for each row execute function kml_internal.sync_adult_year();
commit;
notify pgrst,'reload schema';
