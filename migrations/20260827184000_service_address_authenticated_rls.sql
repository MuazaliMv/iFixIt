BEGIN;

-- Service-address APIs now execute with the signed-in user's JWT instead of
-- requiring a server-side service-role client. Keep access strictly scoped to
-- each user's own rows with RLS.
ALTER TABLE public.user_service_addresses ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_service_addresses TO authenticated;

DROP POLICY IF EXISTS user_service_addresses_select_self ON public.user_service_addresses;
CREATE POLICY user_service_addresses_select_self
ON public.user_service_addresses
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_service_addresses_insert_self ON public.user_service_addresses;
CREATE POLICY user_service_addresses_insert_self
ON public.user_service_addresses
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_service_addresses_update_self ON public.user_service_addresses;
CREATE POLICY user_service_addresses_update_self
ON public.user_service_addresses
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_service_addresses_delete_self ON public.user_service_addresses;
CREATE POLICY user_service_addresses_delete_self
ON public.user_service_addresses
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Permit a signed-in user to synchronize only their own address-related
-- profile columns. Role/provider/admin fields remain unavailable for update.
GRANT UPDATE (
  default_service_address_id,
  address_line1,
  address_line2,
  city,
  state_region,
  postal_code,
  country,
  primary_atoll_id,
  primary_island_id,
  ward
) ON public.auth_profiles TO authenticated;

DROP POLICY IF EXISTS auth_profiles_update_own_service_address ON public.auth_profiles;
CREATE POLICY auth_profiles_update_own_service_address
ON public.auth_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

COMMIT;
