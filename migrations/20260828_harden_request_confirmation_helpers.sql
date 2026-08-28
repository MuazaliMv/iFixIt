-- Harden legacy request-confirmation helper RPCs so SECURITY DEFINER access
-- cannot be used to probe confirmation state for unrelated request UUIDs.
-- Authorized callers: request customer, assigned provider, active admin,
-- or trusted service-role workflows.

create or replace function public.customer_has_confirmed_provider(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null and coalesce(auth.jwt()->>'role','') <> 'service_role' then false
    when not exists (
      select 1
      from public.request_intake r
      where r.id = p_request_id
        and (
          r.customer_auth_user_id = auth.uid()
          or r.assigned_provider_user_id = auth.uid()
          or coalesce(auth.jwt()->>'role','') = 'service_role'
          or exists (
            select 1
            from public.auth_profiles ap
            where ap.user_id = auth.uid()
              and upper(coalesce(ap.role,'')) = 'ADMIN'
              and lower(coalesce(ap.account_status,'active')) <> 'suspended'
          )
        )
    ) then false
    else (
      exists(
        select 1
        from public.request_status_history h
        where h.request_id = p_request_id
          and h.actor_type = 'CUSTOMER'
          and h.to_status = 'ACCEPTED'
          and h.note in ('Customer confirmed ranked provider','Customer selected provider')
      )
      or exists(
        select 1
        from public.request_intake r
        join public.request_provider_responses rr
          on rr.request_id = r.id
         and rr.provider_user_id = r.assigned_provider_user_id
         and rr.status = 'SELECTED'
        where r.id = p_request_id
          and r.status = 'ACCEPTED'
          and r.assigned_provider_user_id is not null
      )
    )
  end;
$$;

create or replace function public.provider_customer_confirmation_exists(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null and coalesce(auth.jwt()->>'role','') <> 'service_role' then false
    when not exists (
      select 1
      from public.request_intake r
      where r.id = p_request_id
        and (
          r.customer_auth_user_id = auth.uid()
          or r.assigned_provider_user_id = auth.uid()
          or coalesce(auth.jwt()->>'role','') = 'service_role'
          or exists (
            select 1
            from public.auth_profiles ap
            where ap.user_id = auth.uid()
              and upper(coalesce(ap.role,'')) = 'ADMIN'
              and lower(coalesce(ap.account_status,'active')) <> 'suspended'
          )
        )
    ) then false
    else exists(
      select 1
      from public.request_status_history h
      where h.request_id = p_request_id
        and h.actor_type = 'CUSTOMER'
        and h.to_status = 'ACCEPTED'
        and h.note in ('Customer confirmed ranked provider','Customer selected provider')
    )
  end;
$$;
