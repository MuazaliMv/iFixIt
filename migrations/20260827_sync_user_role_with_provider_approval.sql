begin;

-- Provider approval is an additive capability, not a replacement for the
-- account's base Customer/Admin role. The canonical user_roles table and its
-- approval-sync trigger are installed by the later forward migration.
drop trigger if exists trg_sync_user_role_with_provider_approval on public.auth_profiles;
drop function if exists public.sync_user_role_with_provider_approval();

comment on column public.auth_profiles.provider_approved is
  'Provider approval entitlement. Synchronizes only the additive PROVIDER assignment in public.user_roles.';

commit;
