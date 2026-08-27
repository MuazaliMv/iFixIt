-- Canonical user identity/profile storage is public.auth_profiles.
-- Legacy public.users and the pre-Supabase user_roles layout contained only
-- isolated test fixtures. Preserve the old role rows outside public while the
-- canonical additive user_roles table is rebuilt against auth.users.

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

-- Archive the legacy role layout instead of deleting it. A later forward
-- migration creates the approved public.user_roles table.
create schema if not exists legacy_archive;
do $$
begin
  if to_regclass('public.user_roles') is not null then
    if to_regclass('legacy_archive.user_roles_pre_additive') is not null then
      raise exception 'legacy_archive.user_roles_pre_additive already exists; legacy role archival requires review';
    end if;
    alter table public.user_roles set schema legacy_archive;
    alter table legacy_archive.user_roles rename to user_roles_pre_additive;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.users') is not null then
    if to_regclass('legacy_archive.users_pre_auth') is not null then
      raise exception 'legacy_archive.users_pre_auth already exists; legacy user archival requires review';
    end if;
    alter table public.users set schema legacy_archive;
    alter table legacy_archive.users rename to users_pre_auth;
  end if;
end
$$;

comment on table public.auth_profiles is
  'Canonical application user profile model. Legacy public.users retired; capabilities use additive public.user_roles assignments.';
