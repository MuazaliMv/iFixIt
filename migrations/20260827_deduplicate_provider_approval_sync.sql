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

-- This function is intended to run only as a trigger. Keep SECURITY DEFINER
-- so the trigger can synchronize the protected onboarding row, but prevent
-- direct RPC execution by public/anon/authenticated callers.
revoke all on function public.sync_onboarding_from_provider_approval() from public;
revoke all on function public.sync_onboarding_from_provider_approval() from anon;
revoke all on function public.sync_onboarding_from_provider_approval() from authenticated;

commit;
