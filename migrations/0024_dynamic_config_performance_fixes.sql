begin;
create index if not exists idx_app_configuration_updated_by on public.app_configuration(updated_by) where updated_by is not null;
create index if not exists idx_location_resolution_cache_atoll on public.location_resolution_cache(atoll_id) where atoll_id is not null;
create index if not exists idx_location_resolution_cache_unit on public.location_resolution_cache(location_unit_id) where location_unit_id is not null;
drop policy if exists auth_profiles_read_self on public.auth_profiles;
create policy auth_profiles_read_self on public.auth_profiles for select to authenticated using (user_id = (select auth.uid()));
commit;
