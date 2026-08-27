-- Canonical request flow is request_intake -> service_jobs.
-- Legacy repair tables were frozen and dependency-checked before this retirement.

create or replace function public.notify_provider_dispatch_offer()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_ticket text;
begin
  select ticket_number into v_ticket from public.request_intake where id=new.request_id;
  insert into public.user_notifications(
    user_id,role,notification_type,title,message,request_id,ticket_number,
    source_type,source_id,action_href,metadata,created_at
  )
  values(
    new.provider_user_id,'PROVIDER','NEW_SERVICE_OFFER','New service request available',
    case when v_ticket is not null then 'A new service request '||v_ticket||' is available for your response.' else 'A new service request is available for your response.' end,
    new.request_id,v_ticket,'request_provider_dispatch_offers',new.id::text,'/provider/jobs',
    jsonb_build_object('response_deadline_at',new.response_deadline_at,'sequence_no',new.sequence_no),
    coalesce(new.offered_at,new.created_at,now())
  )
  on conflict do nothing;
  return new;
end
$function$;

-- Remove the repair-only workflow guard before dropping its table.
drop trigger if exists trg_repair_request_service_workflow on public.repair_requests;
drop function if exists public.enforce_repair_request_service_workflow();

-- No CASCADE: any surviving dependency must block this migration.
drop table public.repair_requests;
drop table public.repair_services;
drop table public.service_subcategories;
