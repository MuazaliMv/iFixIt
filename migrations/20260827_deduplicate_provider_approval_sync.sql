begin;

-- Keep a single canonical AFTER trigger for propagating provider approval
-- into provider_onboarding_profiles. The retained trigger
-- trg_sync_onboarding_from_provider_approval already synchronizes:
--   onboarding_status, accepting_leads, approved_at
-- and only fires when provider_approved actually changes.
--
-- Remove the older overlapping trigger/function to prevent the same approval
-- transition from updating provider onboarding twice.
drop trigger if exists trg_sync_provider_onboarding_from_auth_profile
  on public.auth_profiles;

drop function if exists public.sync_provider_onboarding_from_auth_profile();

commit;
