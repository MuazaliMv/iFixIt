BEGIN;

-- Keep the profile address-history trigger and its audit table in sync.
-- The trigger capture_auth_profile_address_history writes changed_by_user_id.
ALTER TABLE public.profile_address_history
  ADD COLUMN IF NOT EXISTS changed_by_user_id UUID;

CREATE INDEX IF NOT EXISTS profile_address_history_changed_by_user_id_idx
  ON public.profile_address_history(changed_by_user_id)
  WHERE changed_by_user_id IS NOT NULL;

COMMIT;
