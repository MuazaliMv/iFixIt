create or replace function public.accept_ranked_provider_offer(p_ticket text, p_provider_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r public.request_intake%rowtype;
  o public.request_provider_dispatch_offers%rowtype;
  v_label text;
  v_old text;
  v_accepted_at timestamptz;
  v_category_id uuid;
  v_eligible boolean := false;
begin
  select * into r from public.request_intake where ticket_number=upper(btrim(p_ticket)) for update;
  if not found then raise exception 'Request not found'; end if;
  if r.assigned_provider_user_id is not null then raise exception 'Request already secured'; end if;
  if r.status not in ('PENDING','RESPONDED') or r.dispatch_state not in ('SEARCHING','EXTENDED') then raise exception 'Request is not available'; end if;

  select * into o from public.request_provider_dispatch_offers
  where request_id=r.id and provider_user_id=p_provider_user_id and status='OFFERED' for update;
  if not found then raise exception 'No active ranked offer for this provider'; end if;
  if o.response_deadline_at<=now() then
    update public.request_provider_dispatch_offers set status='EXPIRED',responded_at=now(),updated_at=now() where id=o.id;
    perform public.advance_provider_offer(r.id);
    raise exception 'Provider offer expired';
  end if;

  select id into v_category_id from public.service_categories where code=r.service_category_code and is_active=true limit 1;
  select exists(
    select 1
    from public.auth_profiles ap
    join public.provider_onboarding_profiles pop on pop.user_id=ap.user_id
    join public.provider_service_categories psc on psc.provider_user_id=ap.user_id and psc.is_active=true
    left join public.provider_profiles pp on pp.user_id=ap.user_id
    where ap.user_id=p_provider_user_id
      and ap.provider_approved=true
      and ap.role<>'ADMIN'
      and upper(coalesce(ap.account_status,'ACTIVE'))<>'SUSPENDED'
      and pop.onboarding_status='APPROVED'
      and coalesce(pop.accepting_leads,true)=true
      and coalesce(pop.availability_status,'')<>'UNAVAILABLE'
      and coalesce(pp.is_suspended,false)=false
      and psc.category_id=v_category_id
      and (r.service_island_id is null or exists(
        select 1 from public.provider_service_areas psa
        where psa.auth_user_id=p_provider_user_id
          and psa.is_active=true
          and psa.island_id=r.service_island_id
          and (psa.location_unit_id is null or psa.location_unit_id=r.service_location_unit_id)
      ))
  ) into v_eligible;
  if not v_eligible then
    update public.request_provider_dispatch_offers set status='CANCELLED',responded_at=now(),updated_at=now() where id=o.id;
    perform public.advance_provider_offer(r.id);
    raise exception 'Provider is no longer eligible for this request';
  end if;

  select coalesce(pop.public_name,pop.business_name,ap.full_name,'Provider') into v_label
  from public.auth_profiles ap left join public.provider_onboarding_profiles pop on pop.user_id=ap.user_id
  where ap.user_id=p_provider_user_id;

  v_old:=r.status;
  v_accepted_at:=coalesce(r.accepted_at,now());
  update public.request_provider_dispatch_offers set status='ACCEPTED',responded_at=now(),updated_at=now() where id=o.id;
  update public.request_provider_dispatch_offers set status='CANCELLED',updated_at=now() where request_id=r.id and id<>o.id and status='OFFERED';
  insert into public.request_provider_responses(request_id,provider_user_id,status,provider_message,responded_at,selected_at,provider_confirmed_at)
  values(r.id,p_provider_user_id,'SELECTED','Accepted ranked dispatch offer',now(),now(),now())
  on conflict(request_id,provider_user_id) do update set status='SELECTED',responded_at=excluded.responded_at,selected_at=excluded.selected_at,provider_confirmed_at=excluded.provider_confirmed_at,updated_at=now();
  update public.request_intake set status='ACCEPTED',assigned_provider_user_id=p_provider_user_id,assigned_provider_label=v_label,accepted_at=v_accepted_at,dispatch_state='SECURED',dispatch_secured_at=coalesce(dispatch_secured_at,now()),dispatch_last_transition_at=now(),updated_at=now() where id=r.id;
  insert into public.service_jobs(request_id,ticket_number,provider_user_id,provider_label,status,accepted_at)
  values(r.id,r.ticket_number,p_provider_user_id,coalesce(nullif(btrim(v_label),''),'Provider'),'ACCEPTED',v_accepted_at)
  on conflict(request_id) do update set provider_user_id=excluded.provider_user_id,provider_label=excluded.provider_label,status='ACCEPTED',accepted_at=excluded.accepted_at,processing_at=null,completed_at=null,updated_at=now();
  insert into public.request_status_history(request_id,from_status,to_status,actor_type,note)
  values(r.id,v_old,'ACCEPTED','PROVIDER','Provider accepted ranked dispatch offer #'||o.sequence_no);
  if r.customer_auth_user_id is not null then
    insert into public.customer_notifications(user_id,request_id,notification_type,title,message,dispatch_attempt)
    values(r.customer_auth_user_id,r.id,'PROVIDER_ACCEPTED','Provider accepted your request',coalesce(nullif(btrim(v_label),''),'A service provider')||' accepted '||r.ticket_number||'.',r.dispatch_attempt);
  end if;
  return jsonb_build_object('ok',true,'ticket_number',r.ticket_number,'provider_user_id',p_provider_user_id,'sequence_no',o.sequence_no,'rank_score',o.rank_score);
end;
$function$;

create or replace function public.transition_service_job(p_ticket text, p_provider_user_id uuid, p_target_status text)
returns public.service_jobs
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  j public.service_jobs%rowtype;
  old_status text;
  target text:=upper(btrim(p_target_status));
  request_from text;
  request_target text;
  v_customer_user_id uuid;
begin
  select * into j from public.service_jobs where ticket_number=upper(btrim(p_ticket)) for update;
  if not found then raise exception 'Job not found'; end if;
  if j.provider_user_id<>p_provider_user_id then raise exception 'Job belongs to another provider'; end if;
  old_status:=j.status;
  if not public.service_job_transition_allowed(old_status,target) then raise exception 'Invalid job transition: % -> %',old_status,target; end if;

  update public.service_jobs
  set status=target,
      processing_at=case when target='PROCESSING' then now() else processing_at end,
      completed_at=case when target='COMPLETED' then now() else completed_at end
  where id=j.id returning * into j;

  select status,customer_auth_user_id into request_from,v_customer_user_id from public.request_intake where id=j.request_id for update;
  request_target:=case when target='PROCESSING' then 'IN_PROGRESS' when target='COMPLETED' then 'COMPLETED' else request_from end;
  update public.request_intake
  set status=request_target,
      processing_at=case when target='PROCESSING' then j.processing_at else processing_at end,
      completed_at=case when target='COMPLETED' then j.completed_at else completed_at end,
      updated_at=now()
  where id=j.request_id;

  insert into public.service_job_status_history(job_id,from_status,to_status,actor_role,actor_user_id)
  values(j.id,old_status,target,'PROVIDER',p_provider_user_id);

  if request_target is distinct from request_from then
    insert into public.request_status_history(request_id,from_status,to_status,actor_type,note)
    values(j.request_id,request_from,request_target,'PROVIDER','Service job transition');
    if v_customer_user_id is not null then
      if request_target='IN_PROGRESS' then
        insert into public.customer_notifications(user_id,request_id,notification_type,title,message)
        values(v_customer_user_id,j.request_id,'SERVICE_STARTED','Service work started','Your provider started work on '||j.ticket_number||'.');
      elsif request_target='COMPLETED' then
        insert into public.customer_notifications(user_id,request_id,notification_type,title,message)
        values(v_customer_user_id,j.request_id,'SERVICE_COMPLETED','Service completed','Your provider marked '||j.ticket_number||' as completed.');
      end if;
    end if;
  end if;
  return j;
end;
$function$;
