begin;

insert into public.app_configuration(key,value,is_active)
values('operations.sla',jsonb_build_object(
  'provider_confirmation_minutes',15,
  'inspection_schedule_hours',4,
  'estimate_after_inspection_hours',4,
  'work_start_after_approval_hours',4,
  'work_completion_hours',48,
  'completion_confirmation_hours',24
),true)
on conflict (key) do nothing;

create table if not exists public.request_sla_escalations(
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.request_intake(id) on delete cascade,
  ticket_number varchar(64) not null,
  escalation_type text not null check (escalation_type in (
    'DISPATCH_NO_PROVIDER','CUSTOMER_SELECTION_TIMEOUT','PROVIDER_CONFIRMATION_OVERDUE',
    'INSPECTION_SCHEDULING_OVERDUE','ESTIMATE_OVERDUE','WORK_START_OVERDUE',
    'WORK_COMPLETION_OVERDUE','COMPLETION_CONFIRMATION_OVERDUE','ISSUE_REPORTED'
  )),
  severity text not null default 'WARNING' check (severity in ('INFO','WARNING','HIGH','CRITICAL')),
  status text not null default 'OPEN' check (status in ('OPEN','ACKNOWLEDGED','RESOLVED')),
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_request_sla_escalations_status_severity on public.request_sla_escalations(status,severity,last_detected_at desc);
create index if not exists idx_request_sla_escalations_request on public.request_sla_escalations(request_id,last_detected_at desc);
create unique index if not exists uq_request_sla_escalation_open on public.request_sla_escalations(request_id,escalation_type) where status in ('OPEN','ACKNOWLEDGED');
alter table public.request_sla_escalations enable row level security;
revoke all on public.request_sla_escalations from anon, authenticated;

create or replace function public.process_request_sla_escalations()
returns jsonb language plpgsql security definer set search_path=public as $$
declare cfg jsonb; v_now timestamptz:=now(); v_detected int:=0; v_resolved int:=0; r record; v_type text; v_severity text; v_summary text; v_details jsonb;
begin
 select value into cfg from public.app_configuration where key='operations.sla' and is_active=true; cfg:=coalesce(cfg,'{}'::jsonb);
 create temporary table if not exists _sla_seen(request_id uuid,escalation_type text,primary key(request_id,escalation_type)) on commit drop; truncate _sla_seen;
 for r in
  select ri.*,pr.provider_confirmed_at,ins.status inspection_status,ins.scheduled_start,ins.updated_at inspection_updated_at,
    est.status estimate_status,est.decided_at estimate_decided_at,wc.status completion_status,wc.submitted_at completion_submitted_at,wc.issue_reported_at
  from public.request_intake ri
  left join lateral (select provider_confirmed_at from public.request_provider_responses x where x.request_id=ri.id and x.provider_user_id=ri.assigned_provider_user_id and x.status='SELECTED' order by x.updated_at desc limit 1) pr on true
  left join public.request_inspections ins on ins.request_id=ri.id
  left join public.request_estimates est on est.request_id=ri.id
  left join public.request_work_completions wc on wc.request_id=ri.id
  where ri.status<>'CANCELLED'
 loop
  v_type:=null;v_severity:=null;v_summary:=null;v_details:='{}'::jsonb;
  if r.dispatch_state='EXHAUSTED' and r.assigned_provider_user_id is null then v_type:='DISPATCH_NO_PROVIDER';v_severity:='HIGH';v_summary:='No provider found after dispatch search';
  elsif r.dispatch_state='CUSTOMER_TIMEOUT' and r.assigned_provider_user_id is null then v_type:='CUSTOMER_SELECTION_TIMEOUT';v_severity:='WARNING';v_summary:='Customer did not select a provider after retries';
  elsif r.assigned_provider_user_id is not null and r.status='ACCEPTED' and r.provider_confirmed_at is null and r.accepted_at is not null and r.accepted_at<=v_now-make_interval(mins=>coalesce((cfg->>'provider_confirmation_minutes')::int,15)) then v_type:='PROVIDER_CONFIRMATION_OVERDUE';v_severity:='HIGH';v_summary:='Selected provider has not confirmed the job';
  elsif r.provider_confirmed_at is not null and r.status='ACCEPTED' and r.scheduled_start is null and r.provider_confirmed_at<=v_now-make_interval(hours=>coalesce((cfg->>'inspection_schedule_hours')::int,4)) then v_type:='INSPECTION_SCHEDULING_OVERDUE';v_severity:='WARNING';v_summary:='Inspection has not been scheduled';
  elsif r.inspection_status='INSPECTING' and r.estimate_status is null and r.inspection_updated_at is not null and r.inspection_updated_at<=v_now-make_interval(hours=>coalesce((cfg->>'estimate_after_inspection_hours')::int,4)) then v_type:='ESTIMATE_OVERDUE';v_severity:='WARNING';v_summary:='Estimate has not been sent after inspection';
  elsif r.estimate_status='APPROVED' and r.status not in ('IN_PROGRESS','PROCESSING','COMPLETED') and r.estimate_decided_at is not null and r.estimate_decided_at<=v_now-make_interval(hours=>coalesce((cfg->>'work_start_after_approval_hours')::int,4)) then v_type:='WORK_START_OVERDUE';v_severity:='HIGH';v_summary:='Approved work has not started';
  elsif r.status in ('IN_PROGRESS','PROCESSING') and r.processing_at is not null and r.completion_status is null and r.processing_at<=v_now-make_interval(hours=>coalesce((cfg->>'work_completion_hours')::int,48)) then v_type:='WORK_COMPLETION_OVERDUE';v_severity:='HIGH';v_summary:='Work is overdue for completion';
  elsif r.completion_status='SUBMITTED' and r.completion_submitted_at is not null and r.completion_submitted_at<=v_now-make_interval(hours=>coalesce((cfg->>'completion_confirmation_hours')::int,24)) then v_type:='COMPLETION_CONFIRMATION_OVERDUE';v_severity:='WARNING';v_summary:='Customer completion confirmation is overdue';
  elsif r.completion_status='ISSUE_REPORTED' then v_type:='ISSUE_REPORTED';v_severity:='CRITICAL';v_summary:='Customer reported a problem with completed work'; end if;
  if v_type is not null then
   v_details:=jsonb_build_object('request_status',r.status,'dispatch_state',r.dispatch_state,'provider_user_id',r.assigned_provider_user_id);
   insert into _sla_seen values(r.id,v_type) on conflict do nothing;
   update public.request_sla_escalations set severity=v_severity,summary=v_summary,details=v_details,last_detected_at=v_now,updated_at=v_now where request_id=r.id and escalation_type=v_type and status in ('OPEN','ACKNOWLEDGED');
   if not found then insert into public.request_sla_escalations(request_id,ticket_number,escalation_type,severity,summary,details) values(r.id,r.ticket_number,v_type,v_severity,v_summary,v_details); end if;
   v_detected:=v_detected+1;
  end if;
 end loop;
 update public.request_sla_escalations e set status='RESOLVED',resolved_at=v_now,updated_at=v_now where e.status in ('OPEN','ACKNOWLEDGED') and not exists(select 1 from _sla_seen s where s.request_id=e.request_id and s.escalation_type=e.escalation_type);
 get diagnostics v_resolved=row_count;
 return jsonb_build_object('detected',v_detected,'resolved',v_resolved,'processed_at',v_now);
end $$;
revoke all on function public.process_request_sla_escalations() from public,anon,authenticated;
grant execute on function public.process_request_sla_escalations() to service_role;

create or replace function public.admin_acknowledge_sla_escalation(p_escalation_id uuid,p_admin_user_id uuid)
returns public.request_sla_escalations language plpgsql security definer set search_path=public as $$
declare e public.request_sla_escalations%rowtype;
begin
 if not exists(select 1 from public.auth_profiles where user_id=p_admin_user_id and role='ADMIN') then raise exception 'Administrator role required'; end if;
 update public.request_sla_escalations set status='ACKNOWLEDGED',acknowledged_at=now(),acknowledged_by=p_admin_user_id,updated_at=now() where id=p_escalation_id and status='OPEN' returning * into e;
 if not found then raise exception 'Open escalation not found'; end if; return e;
end $$;
revoke all on function public.admin_acknowledge_sla_escalation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_acknowledge_sla_escalation(uuid,uuid) to service_role;

create or replace function public.admin_resolve_sla_escalation(p_escalation_id uuid,p_admin_user_id uuid)
returns public.request_sla_escalations language plpgsql security definer set search_path=public as $$
declare e public.request_sla_escalations%rowtype;
begin
 if not exists(select 1 from public.auth_profiles where user_id=p_admin_user_id and role='ADMIN') then raise exception 'Administrator role required'; end if;
 update public.request_sla_escalations set status='RESOLVED',resolved_at=now(),updated_at=now() where id=p_escalation_id and status in ('OPEN','ACKNOWLEDGED') returning * into e;
 if not found then raise exception 'Active escalation not found'; end if; return e;
end $$;
revoke all on function public.admin_resolve_sla_escalation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_resolve_sla_escalation(uuid,uuid) to service_role;

select cron.schedule('fixit-sla-escalations','*/5 * * * *','select public.process_request_sla_escalations();') where not exists(select 1 from cron.job where jobname='fixit-sla-escalations');
commit;
