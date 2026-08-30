-- Provider approval must be backed by approved verification documents.
-- Individual providers require an approved ID Card.
-- Business providers require an approved ID Card and Business Registration.

create or replace function public.enforce_provider_verification_before_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  has_id boolean;
  has_business_license boolean;
begin
  if new.onboarding_status = 'APPROVED'
     and coalesce(old.onboarding_status, '') is distinct from 'APPROVED' then
    select exists (
      select 1
      from public.provider_verification_documents d
      where d.provider_user_id = new.user_id
        and d.document_type = 'ID_CARD'
        and d.review_status = 'APPROVED'
    ) into has_id;

    if not has_id then
      raise exception using message = 'Provider approval requires an approved ID Card.';
    end if;

    if new.provider_type = 'BUSINESS' then
      select exists (
        select 1
        from public.provider_verification_documents d
        where d.provider_user_id = new.user_id
          and d.document_type = 'BUSINESS_LICENSE'
          and d.review_status = 'APPROVED'
      ) into has_business_license;

      if not has_business_license then
        raise exception using message = 'Business provider approval requires an approved Business Registration.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_provider_verification_before_approval on public.provider_onboarding_profiles;
create trigger trg_enforce_provider_verification_before_approval
before update of onboarding_status on public.provider_onboarding_profiles
for each row
execute function public.enforce_provider_verification_before_approval();
