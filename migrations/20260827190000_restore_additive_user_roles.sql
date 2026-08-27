begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- The frozen MVP uses one additive role-assignment table. Older deployments
-- either dropped public.user_roles or still have its pre-Supabase role_id
-- layout. Preserve that legacy layout outside public before creating the
-- canonical auth.users-owned table.
create schema if not exists legacy_archive;

do $$
begin
  if to_regclass('public.user_roles') is not null
     and not exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'user_roles'
         and column_name = 'role'
     ) then
    if to_regclass('legacy_archive.user_roles_pre_additive') is not null then
      raise exception 'legacy_archive.user_roles_pre_additive already exists; additive role cutover requires review';
    end if;

    alter table public.user_roles set schema legacy_archive;
    alter table legacy_archive.user_roles rename to user_roles_pre_additive;
  end if;
end
$$;

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  is_active boolean not null default true,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint user_roles_pkey primary key (user_id, role),
  constraint user_roles_role_check check (role in ('CUSTOMER', 'PROVIDER', 'ADMIN'))
);

create index if not exists user_roles_active_role_idx
  on public.user_roles (role, user_id)
  where is_active = true;

alter table public.user_roles enable row level security;
revoke all on table public.user_roles from anon;
revoke insert, update, delete, truncate on table public.user_roles from authenticated;
grant select on table public.user_roles to authenticated;

drop policy if exists user_roles_select_self on public.user_roles;
create policy user_roles_select_self
on public.user_roles
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Preserve every account's Customer capability. Admin and Provider are
-- additional capabilities and never replace Customer or each other.
insert into public.user_roles (user_id, role, is_active)
select user_id, 'CUSTOMER', true
from public.auth_profiles
on conflict (user_id, role) do update
set is_active = true,
    updated_at = now();

insert into public.user_roles (user_id, role, is_active)
select user_id, 'ADMIN', true
from public.auth_profiles
where role = 'ADMIN'
on conflict (user_id, role) do update
set is_active = true,
    updated_at = now();

insert into public.user_roles (user_id, role, is_active)
select user_id, 'PROVIDER', true
from public.auth_profiles
where provider_approved = true
on conflict (user_id, role) do update
set is_active = true,
    updated_at = now();

update public.user_roles ur
set is_active = false,
    updated_at = now()
where ur.role = 'PROVIDER'
  and ur.is_active = true
  and not exists (
    select 1
    from public.auth_profiles ap
    where ap.user_id = ur.user_id
      and ap.provider_approved = true
  );

-- Supersede the mutually exclusive scalar-role trigger already applied in
-- production. Provider approval now changes only the Provider assignment.
drop trigger if exists trg_sync_user_role_with_provider_approval on public.auth_profiles;
drop function if exists public.sync_user_role_with_provider_approval();

-- The legacy scalar PROVIDER value is no longer an authorization assignment.
-- Preserve Provider capability above, then restore the permanent base account
-- mode to Customer. Admin and existing Customer values are never changed.
update public.auth_profiles
set role = 'CUSTOMER'
where role = 'PROVIDER';

create schema if not exists private;
create or replace function private.sync_provider_role_from_approval()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.user_roles (user_id, role, is_active)
    values (new.user_id, 'CUSTOMER', true)
    on conflict (user_id, role) do update
    set is_active = true,
        updated_at = now();

    if new.role = 'ADMIN' then
      insert into public.user_roles (user_id, role, is_active)
      values (new.user_id, 'ADMIN', true)
      on conflict (user_id, role) do update
      set is_active = true,
          updated_at = now();
    end if;
  end if;

  if coalesce(new.provider_approved, false) then
    insert into public.user_roles (user_id, role, is_active)
    values (new.user_id, 'PROVIDER', true)
    on conflict (user_id, role) do update
    set is_active = true,
        updated_at = now();
  else
    update public.user_roles
    set is_active = false,
        updated_at = now()
    where user_id = new.user_id
      and role = 'PROVIDER'
      and is_active = true;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_provider_role_from_approval() from public, anon, authenticated;
grant execute on function private.sync_provider_role_from_approval() to service_role;

drop trigger if exists trg_sync_provider_role_from_approval on public.auth_profiles;
create trigger trg_sync_provider_role_from_approval
after insert or update of provider_approved on public.auth_profiles
for each row
execute function private.sync_provider_role_from_approval();

comment on table public.user_roles is
  'Canonical additive Customer, Provider and Admin capability assignments owned by auth.users.';

commit;
