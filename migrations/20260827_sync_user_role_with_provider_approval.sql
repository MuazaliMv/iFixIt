begin;

create or replace function public.sync_user_role_with_provider_approval()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Admin is additive and must never be downgraded by provider approval state.
  if new.role = 'ADMIN' then
    return new;
  end if;

  -- Approved provider applications promote the account role to PROVIDER.
  if coalesce(new.provider_approved, false) then
    new.role := 'PROVIDER';
  -- If provider approval is removed, return a provider-only base role to CUSTOMER.
  elsif new.role = 'PROVIDER' then
    new.role := 'CUSTOMER';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_user_role_with_provider_approval on public.auth_profiles;
create trigger trg_sync_user_role_with_provider_approval
before insert or update of role, provider_approved on public.auth_profiles
for each row
execute function public.sync_user_role_with_provider_approval();

-- Repair any historical inconsistencies.
update public.auth_profiles
set role = 'PROVIDER'
where provider_approved = true
  and role = 'CUSTOMER';

update public.auth_profiles
set role = 'CUSTOMER'
where provider_approved = false
  and role = 'PROVIDER';

commit;
