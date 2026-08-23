-- Keep provider marketplace eligibility in sync with approval/suspension state.

create or replace function public.sync_provider_marketplace_status()
returns trigger
language plpgsql
as $$
begin
  if new.approval_status = 'APPROVED'
     and coalesce(new.is_suspended, false) = false
     and coalesce(new.accepting_leads, false) = true then
    new.marketplace_status := 'ACTIVE';
  elsif new.approval_status <> 'APPROVED'
        or coalesce(new.is_suspended, false) = true then
    new.marketplace_status := 'INACTIVE';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_provider_marketplace_status on public.provider_profiles;

create trigger trg_sync_provider_marketplace_status
before insert or update of approval_status, is_suspended, accepting_leads
on public.provider_profiles
for each row
execute function public.sync_provider_marketplace_status();

update public.provider_profiles
set marketplace_status = 'ACTIVE',
    updated_at = now()
where approval_status = 'APPROVED'
  and coalesce(is_suspended, false) = false
  and coalesce(accepting_leads, false) = true
  and marketplace_status <> 'ACTIVE';

update public.provider_profiles
set marketplace_status = 'INACTIVE',
    updated_at = now()
where (approval_status <> 'APPROVED' or coalesce(is_suspended, false) = true)
  and marketplace_status <> 'INACTIVE';
