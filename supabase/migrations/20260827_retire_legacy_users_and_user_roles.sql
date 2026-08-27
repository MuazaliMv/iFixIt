-- Canonical user identity/profile storage is public.auth_profiles.
-- Legacy public.users and public.user_roles contained only isolated test fixtures
-- and were removed after runtime/database dependency migration.

drop policy if exists activity_logs_admin_read on public.activity_logs;
create policy activity_logs_admin_read
on public.activity_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.auth_profiles ap
    where ap.user_id = auth.uid()
      and upper(coalesce(ap.role,'CUSTOMER')) = 'ADMIN'
      and upper(coalesce(ap.account_status,'ACTIVE')) <> 'SUSPENDED'
  )
);

-- The active service-address failover function is canonical auth_profiles-only.
-- The live function was replaced in production before these legacy tables were removed.

-- Repair-only suspension guard belonged to the frozen repair_requests model.
drop trigger if exists trg_guard_suspended_repair_customer on public.repair_requests;
drop function if exists public.guard_suspended_repair_customer();

-- Final retirement after dependency and fixture validation.
drop table if exists public.user_roles;
drop table if exists public.users;

comment on table public.auth_profiles is
  'Canonical application user profile model. Legacy public.users/public.user_roles retired 2026-08-27.';
