create or replace function public.customer_confirm_ranked_provider(p_ticket text, p_customer_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r public.request_intake%rowtype;
  resp public.request_provider_responses%rowtype;
  already_confirmed boolean;
  caller_user_id uuid := auth.uid();
begin
  if caller_user_id is not null and caller_user_id is distinct from p_customer_user_id then
    raise exception 'Customer identity mismatch';
  end if;

  select * into r
  from public.request_intake
  where ticket_number = upper(btrim(p_ticket))
  for update;

  if not found then
    raise exception 'Request not found';
  end if;

  if r.customer_auth_user_id is distinct from p_customer_user_id then
    raise exception 'Request does not belong to customer';
  end if;

  if r.status <> 'ACCEPTED' or r.assigned_provider_user_id is null then
    raise exception 'No accepted provider is awaiting customer confirmation';
  end if;

  select * into resp
  from public.request_provider_responses
  where request_id = r.id
    and provider_user_id = r.assigned_provider_user_id
    and status = 'SELECTED'
  for update;

  if not found then
    raise exception 'Selected provider record not found';
  end if;

  select exists(
    select 1
    from public.request_status_history h
    where h.request_id = r.id
      and h.actor_type = 'CUSTOMER'
      and h.to_status = 'ACCEPTED'
      and h.note = 'Customer confirmed ranked provider'
  ) into already_confirmed;

  if not already_confirmed then
    insert into public.request_status_history(
      request_id, from_status, to_status, actor_type, note
    ) values (
      r.id, r.status, 'ACCEPTED', 'CUSTOMER', 'Customer confirmed ranked provider'
    );
  end if;

  insert into public.customer_notifications(
    user_id, request_id, notification_type, title, message, dispatch_attempt
  )
  values(
    p_customer_user_id,
    r.id,
    'PROVIDER_CONFIRMED_BY_CUSTOMER',
    'Provider confirmed',
    'Your selected provider is confirmed. Scheduling can now continue.',
    r.dispatch_attempt
  )
  on conflict do nothing;

  return jsonb_build_object(
    'ok', true,
    'ticket_number', r.ticket_number,
    'provider_user_id', r.assigned_provider_user_id,
    'customer_confirmed', true,
    'already_confirmed', already_confirmed
  );
end;
$function$;

revoke execute on function public.customer_confirm_ranked_provider(text, uuid) from public, anon;
grant execute on function public.customer_confirm_ranked_provider(text, uuid) to authenticated, service_role;
