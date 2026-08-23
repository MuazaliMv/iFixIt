-- Admin approval is the authoritative provider activation event.
-- Approved, non-suspended providers become marketplace-active immediately,
-- and first-time approval enables lead acceptance automatically.

create or replace function public.sync_provider_marketplace_status()
returns trigger
language plpgsql
as $$
begin
  if new.approval_status = 'APPROVED'
     and coalesce(new.is_suspended, false) = false then
    new.marketplace_status := 'ACTIVE';

    if tg_op = 'INSERT'
       or old.approval_status is distinct from 'APPROVED' then
      new.accepting_leads := true;
    end if;

  elsif new.approval_status <> 'APPROVED'
        or coalesce(new.is_suspended, false) = true then
    new.marketplace_status := 'INACTIVE';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_provider_marketplace_status on public.provider_profiles;

create trigger trg_sync_provider_marketplace_status
before insert or update of approval_status, is_suspended
on public.provider_profiles
for each row
execute function public.sync_provider_marketplace_status();

update public.provider_profiles
set marketplace_status = 'ACTIVE',
    accepting_leads = true,
    updated_at = now()
where approval_status = 'APPROVED'
  and coalesce(is_suspended, false) = false
  and (marketplace_status <> 'ACTIVE' or coalesce(accepting_leads, false) = false);

update public.provider_profiles
set marketplace_status = 'INACTIVE',
    updated_at = now()
where (approval_status <> 'APPROVED' or coalesce(is_suspended, false) = true)
  and marketplace_status <> 'INACTIVE';