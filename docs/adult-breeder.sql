-- External breeders are labels, never synthetic member accounts.
-- Existing owner/admin RLS remains authoritative for every update.
begin;
alter table public.kml_adults add column if not exists breeder_name text not null default '';
alter table public.kml_adults add constraint kml_adults_breeder_name_check
 check(length(breeder_name)<=80 and breeder_name=btrim(breeder_name)
       and (breeder_id is null or breeder_name=''));
commit;
notify pgrst,'reload schema';
