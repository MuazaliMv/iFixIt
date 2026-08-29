create or replace function public.seed_ranked_provider_offer()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.status in ('PENDING','RESPONDED')
     and new.assigned_provider_user_id is null
     and new.dispatch_state in ('SEARCHING','EXTENDED') then
    perform public.advance_provider_offer(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_seed_ranked_provider_offer on public.request_intake;
create trigger trg_seed_ranked_provider_offer
after insert on public.request_intake
for each row execute function public.seed_ranked_provider_offer();

create or replace function public.accept_ranked_provider_offer(p_ticket text, p_provider_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
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
  return jsonb_build_object('ok',true,'ticket_number',r.ticket_number,'provider_user_id',p_provider_user_id,'sequence_no',o.sequence_no,'rank_score',o.rank_score);
end;
$$;
