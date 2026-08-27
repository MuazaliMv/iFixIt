begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- The authenticated role must operate as the signed-in user under RLS, but
-- it must not be able to revive the deprecated Ward-ID relationship through
-- a direct PostgREST request. Replace table-wide privileges with an explicit
-- column contract that contains only the frozen MVP address fields.
revoke select, insert, update on public.user_service_addresses from authenticated;

grant select (
  id,
  user_id,
  label,
  address_line1,
  address_line2,
  city,
  ward,
  state_region,
  postal_code,
  country,
  service_atoll_id,
  service_island_id,
  access_instructions,
  is_default,
  is_active,
  created_at,
  updated_at
) on public.user_service_addresses to authenticated;

grant insert (
  user_id,
  label,
  address_line1,
  address_line2,
  city,
  ward,
  state_region,
  postal_code,
  country,
  service_atoll_id,
  service_island_id,
  access_instructions,
  is_default,
  is_active
) on public.user_service_addresses to authenticated;

grant update (
  label,
  address_line1,
  address_line2,
  city,
  ward,
  state_region,
  postal_code,
  country,
  service_atoll_id,
  service_island_id,
  access_instructions,
  is_default,
  is_active
) on public.user_service_addresses to authenticated;

-- Supersede the earlier profile grant. Ward is optional text and the signed-in
-- user may synchronize only their own approved address/profile columns under
-- auth_profiles_update_own_service_address.
revoke update (primary_location_unit_id) on public.auth_profiles from authenticated;
grant update (ward) on public.auth_profiles to authenticated;

commit;
