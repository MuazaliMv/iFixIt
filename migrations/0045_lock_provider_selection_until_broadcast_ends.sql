create or replace function public.customer_select_marketplace_provider(p_ticket text, p_customer_user_id uuid, p_provider_user_id uuid)
returns public.service_jobs
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r public.request_intake%rowtype;
  resp public.request_provider_responses%rowtype;
  j public.service_jobs%rowtype;
  provider_label text;
  old_status text;
begin
  select * into r from public.request_intake where ticket_number=upper(btrim(p_ticket)) for update;
  if not found then raise exception 'Request not found'; end if;
  if r.customer_auth_user_id is distinct from p_customer_user_id then raise exception 'Request does not belong to customer'; end if;
  if r.status not in ('PENDING','RESPONDED') then raise exception 'Provider can only be selected while request is awaiting customer selection'; end if;
  if r.assigned_provider_user_id is not null then raise exception 'A provider is already assigned to this request'; end if;
  if r.dispatch_state <> 'AWAITING_CUSTOMER' then
    raise exception 'Provider selection is locked until the broadcast timer expires';
  end if;
  if r.dispatch_customer_response_deadline_at is not null and r.dispatch_customer_response_deadline_at <= now() then
    raise exception 'Provider selection window has expired';
  end if;

  select * into resp from public.request_provider_responses
  where request_id=r.id and provider_user_id=p_provider_user_id and status='INTERESTED'
  for update;
  if not found then raise exception 'Provider is not available for selection'; end if;

  select coalesce(pop.public_name,ap.full_name,ap.email,'Provider') into provider_label
  from public.auth_profiles ap
  left join public.provider_onboarding_profiles pop on pop.user_id=ap.user_id
  where ap.user_id=p_provider_user_id and ap.role='PROVIDER' and ap.provider_approved=true;
  if provider_label is null then raise exception 'Provider is no longer eligible'; end if;

  old_status:=r.status;
  insert into public.service_jobs(request_id,ticket_number,provider_user_id,provider_label,status,accepted_at)
  values(r.id,r.ticket_number,p_provider_user_id,provider_label,'ACCEPTED',now()) returning * into j;

  update public.request_intake
  set status='ACCEPTED',assigned_provider_user_id=p_provider_user_id,assigned_provider_label=provider_label,
      accepted_at=j.accepted_at,dispatch_state='SECURED',dispatch_secured_at=now(),
      dispatch_customer_response_deadline_at=null,dispatch_last_transition_at=now(),updated_at=now()
  where id=r.id;

  update public.request_provider_responses
  set status=case when provider_user_id=p_provider_user_id then 'SELECTED' else 'NOT_SELECTED' end,
      selected_at=case when provider_user_id=p_provider_user_id then now() else selected_at end
  where request_id=r.id and status='INTERESTED';

  insert into public.service_job_status_history(job_id,from_status,to_status,actor_role,actor_user_id,note)
  values(j.id,null,'ACCEPTED','SYSTEM',p_customer_user_id,'Customer selected provider after broadcast window');
  insert into public.request_status_history(request_id,from_status,to_status,actor_type,note)
  values(r.id,old_status,'ACCEPTED','CUSTOMER','Customer selected provider after broadcast window');
  return j;
end $function$;
