-- Ranked provider matching and automatic A->B->C progression.
-- Production migration mirrors the live Supabase changes applied on 2026-08-22.

create table if not exists public.request_provider_dispatch_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.request_intake(id) on delete cascade,
  provider_user_id uuid not null references auth.users(id) on delete restrict,
  sequence_no integer not null,
  rank_score numeric(6,2) not null,
  rank_breakdown jsonb not null default '{}'::jsonb,
  status text not null check (status in ('OFFERED','ACCEPTED','DECLINED','EXPIRED','CANCELLED')),
  offered_at timestamptz not null default now(),
  response_deadline_at timestamptz not null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(request_id,provider_user_id), unique(request_id,sequence_no)
);
create unique index if not exists ux_request_provider_dispatch_active_offer on public.request_provider_dispatch_offers(request_id) where status='OFFERED';
create index if not exists idx_request_provider_dispatch_provider_active on public.request_provider_dispatch_offers(provider_user_id,status,response_deadline_at);
create index if not exists idx_request_provider_dispatch_request on public.request_provider_dispatch_offers(request_id,sequence_no);
alter table public.request_provider_dispatch_offers enable row level security;
revoke all on public.request_provider_dispatch_offers from anon,authenticated;

insert into public.app_configuration(key,value,is_active) values
('matching.weights','{"service":30,"location":25,"availability":15,"rating":10,"response_speed":8,"completion_rate":7,"workload":3,"reliability":2}'::jsonb,true),
('matching.offer_windows_minutes','{"URGENT":10,"STANDARD":15,"SCHEDULED":30}'::jsonb,true)
on conflict(key) do update set value=excluded.value,is_active=true,updated_at=now();

create or replace function public.provider_offer_window_for_tier(p_tier text) returns interval language sql stable set search_path='public' as $$
select make_interval(mins=>case upper(coalesce(p_tier,'STANDARD'))
 when 'URGENT' then coalesce((select (value->>'URGENT')::int from public.app_configuration where key='matching.offer_windows_minutes' and is_active),10)
 when 'SCHEDULED' then coalesce((select (value->>'SCHEDULED')::int from public.app_configuration where key='matching.offer_windows_minutes' and is_active),30)
 else coalesce((select (value->>'STANDARD')::int from public.app_configuration where key='matching.offer_windows_minutes' and is_active),15) end) $$;

create or replace function public.rank_request_providers(p_request_id uuid)
returns table(provider_user_id uuid,total_score numeric,score_breakdown jsonb)
language sql stable security definer set search_path='public' as $$
with req as (
 select r.*,sc.id category_id from public.request_intake r left join public.service_categories sc on sc.code=r.service_category_code and sc.is_active where r.id=p_request_id
), eligible as (
 select ap.user_id,pop.availability_status,req.service_island_id,
 exists(select 1 from public.provider_service_areas psa where psa.auth_user_id=ap.user_id and psa.is_active and psa.island_id=req.service_island_id and (psa.location_unit_id is null or psa.location_unit_id=req.service_location_unit_id)) exact_area
 from req join public.auth_profiles ap on ap.role='PROVIDER' and ap.provider_approved=true
 join public.provider_onboarding_profiles pop on pop.user_id=ap.user_id and pop.onboarding_status='APPROVED' and coalesce(pop.accepting_leads,true)=true and coalesce(pop.availability_status,'')<>'UNAVAILABLE'
 join public.provider_service_categories psc on psc.provider_user_id=ap.user_id and psc.is_active and psc.category_id=req.category_id
 where req.category_id is not null
 and (req.service_island_id is null or exists(select 1 from public.provider_service_areas psa where psa.auth_user_id=ap.user_id and psa.is_active and psa.island_id=req.service_island_id and (psa.location_unit_id is null or psa.location_unit_id=req.service_location_unit_id)))
 and not exists(select 1 from public.request_provider_dispatch_offers o where o.request_id=p_request_id and o.provider_user_id=ap.user_id)
 and not exists(select 1 from public.request_provider_responses pr where pr.request_id=p_request_id and pr.provider_user_id=ap.user_id and pr.status in ('DECLINED','WITHDRAWN'))
), metrics as (
 select e.user_id,
 case upper(coalesce(e.availability_status,'')) when 'AVAILABLE_NOW' then 15 when 'AVAILABLE' then 13 when 'BY_APPOINTMENT' then 10 when 'BUSY' then 5 else 8 end::numeric availability_score,
 case when e.service_island_id is null then 18 when e.exact_area then 25 else 0 end::numeric location_score,
 coalesce((select least(10::numeric,greatest(0::numeric,avg(rr.overall_rating)*2)) from public.request_reviews rr where rr.provider_user_id=e.user_id and rr.overall_rating is not null),7::numeric) rating_score,
 coalesce((select case when avg(extract(epoch from(pr.responded_at-ri.created_at))/60.0)<=10 then 8 when avg(extract(epoch from(pr.responded_at-ri.created_at))/60.0)<=30 then 6 when avg(extract(epoch from(pr.responded_at-ri.created_at))/60.0)<=60 then 4 when avg(extract(epoch from(pr.responded_at-ri.created_at))/60.0)<=180 then 2 else 1 end from public.request_provider_responses pr join public.request_intake ri on ri.id=pr.request_id where pr.provider_user_id=e.user_id and pr.responded_at is not null),5::numeric) response_score,
 coalesce((select case when count(*)=0 then 5::numeric else round((count(*) filter(where sj.status='COMPLETED'))::numeric/count(*)::numeric*7,2) end from public.service_jobs sj where sj.provider_user_id=e.user_id),5::numeric) completion_score,
 (select case when count(*)=0 then 3 when count(*)=1 then 2 when count(*)=2 then 1 else 0 end from public.service_jobs sj where sj.provider_user_id=e.user_id and sj.status not in ('COMPLETED','CANCELLED'))::numeric workload_score,
 coalesce((select case when count(*)=0 then 1.5::numeric else round(2*(1-(count(*) filter(where pr.status in ('DECLINED','WITHDRAWN')))::numeric/count(*)::numeric),2) end from public.request_provider_responses pr where pr.provider_user_id=e.user_id),1.5::numeric) reliability_score
 from eligible e
)
select m.user_id,round(30+m.location_score+m.availability_score+m.rating_score+m.response_score+m.completion_score+m.workload_score+m.reliability_score,2),
jsonb_build_object('service',30,'location',m.location_score,'availability',m.availability_score,'rating',m.rating_score,'response_speed',m.response_score,'completion_rate',m.completion_score,'workload',m.workload_score,'reliability',m.reliability_score)
from metrics m order by 2 desc,m.user_id $$;
revoke all on function public.rank_request_providers(uuid) from public,anon,authenticated;

create or replace function public.advance_provider_offer(p_request_id uuid) returns jsonb language plpgsql security definer set search_path='public' as $$
declare r public.request_intake%rowtype;c record;v_seq int;v_offer uuid;
begin
 select * into r from public.request_intake where id=p_request_id for update;
 if not found then return jsonb_build_object('status','NOT_FOUND'); end if;
 if r.assigned_provider_user_id is not null or r.status not in ('PENDING','RESPONDED') or r.dispatch_state not in ('SEARCHING','EXTENDED') then
  update public.request_provider_dispatch_offers set status='CANCELLED',updated_at=now() where request_id=r.id and status='OFFERED'; return jsonb_build_object('status','NOT_ELIGIBLE'); end if;
 update public.request_provider_dispatch_offers set status='EXPIRED',responded_at=coalesce(responded_at,now()),updated_at=now() where request_id=r.id and status='OFFERED' and response_deadline_at<=now();
 if exists(select 1 from public.request_provider_dispatch_offers where request_id=r.id and status='OFFERED') then return jsonb_build_object('status','ACTIVE_OFFER'); end if;
 select * into c from public.rank_request_providers(r.id) limit 1; if not found then return jsonb_build_object('status','NO_CANDIDATE'); end if;
 select coalesce(max(sequence_no),0)+1 into v_seq from public.request_provider_dispatch_offers where request_id=r.id;
 insert into public.request_provider_dispatch_offers(request_id,provider_user_id,sequence_no,rank_score,rank_breakdown,status,response_deadline_at)
 values(r.id,c.provider_user_id,v_seq,c.total_score,c.score_breakdown,'OFFERED',now()+public.provider_offer_window_for_tier(r.dispatch_tier)) returning id into v_offer;
 insert into public.request_status_history(request_id,from_status,to_status,actor_type,note) values(r.id,r.status,r.status,'SYSTEM','Ranked provider offer #'||v_seq||' sent; score '||c.total_score);
 return jsonb_build_object('status','OFFERED','offer_id',v_offer,'provider_user_id',c.provider_user_id,'sequence_no',v_seq,'score',c.total_score);
end $$;
revoke all on function public.advance_provider_offer(uuid) from public,anon,authenticated;

create or replace function public.process_provider_offer_progression() returns jsonb language plpgsql security definer set search_path='public' as $$
declare r record;v_started int:=0;v_expired int:=0;v_result jsonb;
begin
 with expired as (update public.request_provider_dispatch_offers set status='EXPIRED',responded_at=coalesce(responded_at,now()),updated_at=now() where status='OFFERED' and response_deadline_at<=now() returning request_id) select count(*) into v_expired from expired;
 for r in select id from public.request_intake where status in ('PENDING','RESPONDED') and assigned_provider_user_id is null and dispatch_state in ('SEARCHING','EXTENDED') order by created_at for update skip locked loop
 loop v_result:=public.advance_provider_offer(r.id); if v_result->>'status'='OFFERED' then v_started:=v_started+1; end if; end loop;
 return jsonb_build_object('offers_started',v_started,'offers_expired',v_expired,'processed_at',now());
end $$;
revoke all on function public.process_provider_offer_progression() from public,anon,authenticated;

create or replace function public.enforce_ranked_provider_response() returns trigger language plpgsql security definer set search_path='public' as $$
declare v_offer public.request_provider_dispatch_offers%rowtype;v_ranked boolean;
begin
 select exists(select 1 from public.request_provider_dispatch_offers where request_id=new.request_id) into v_ranked; if not v_ranked then return new; end if;
 if new.status='INTERESTED' then
  select * into v_offer from public.request_provider_dispatch_offers where request_id=new.request_id and provider_user_id=new.provider_user_id and status='OFFERED' for update;
  if not found then raise exception 'This request is currently offered to another ranked provider'; end if;
  if v_offer.response_deadline_at<=now() then update public.request_provider_dispatch_offers set status='EXPIRED',responded_at=now(),updated_at=now() where id=v_offer.id; perform public.advance_provider_offer(new.request_id); raise exception 'Your ranked provider offer has expired'; end if;
  new.status:='SELECTED';new.responded_at:=coalesce(new.responded_at,now());new.selected_at:=now();new.provider_confirmed_at:=now();
 elsif new.status='DECLINED' then
  select * into v_offer from public.request_provider_dispatch_offers where request_id=new.request_id and provider_user_id=new.provider_user_id and status='OFFERED' for update;
  if not found then raise exception 'This request is not currently offered to this provider'; end if;
 end if; return new;
end $$;
revoke all on function public.enforce_ranked_provider_response() from public,anon,authenticated;
drop trigger if exists trg_enforce_ranked_provider_response on public.request_provider_responses;
create trigger trg_enforce_ranked_provider_response before insert or update of status on public.request_provider_responses for each row execute function public.enforce_ranked_provider_response();

create or replace function public.finalize_ranked_provider_response() returns trigger language plpgsql security definer set search_path='public' as $$
declare r public.request_intake%rowtype;o public.request_provider_dispatch_offers%rowtype;v_label text;j public.service_jobs%rowtype;v_old text;
begin
 select * into o from public.request_provider_dispatch_offers where request_id=new.request_id and provider_user_id=new.provider_user_id and status='OFFERED' for update; if not found then return new; end if;
 select * into r from public.request_intake where id=new.request_id for update;
 if new.status='SELECTED' then
  select coalesce(pop.public_name,pop.business_name,ap.full_name,ap.email,'Provider') into v_label from public.auth_profiles ap left join public.provider_onboarding_profiles pop on pop.user_id=ap.user_id where ap.user_id=new.provider_user_id;v_old:=r.status;
  insert into public.service_jobs(request_id,ticket_number,provider_user_id,provider_label,status,accepted_at) select r.id,r.ticket_number,new.provider_user_id,v_label,'ACCEPTED',now() where not exists(select 1 from public.service_jobs where request_id=r.id) returning * into j;
  if j.id is null then select * into j from public.service_jobs where request_id=r.id limit 1; end if;
  update public.request_provider_dispatch_offers set status='ACCEPTED',responded_at=now(),updated_at=now() where id=o.id;
  update public.request_provider_dispatch_offers set status='CANCELLED',updated_at=now() where request_id=r.id and id<>o.id and status='OFFERED';
  update public.request_intake set status='ACCEPTED',assigned_provider_user_id=new.provider_user_id,assigned_provider_label=v_label,accepted_at=coalesce(accepted_at,now()),dispatch_state='SECURED',dispatch_secured_at=coalesce(dispatch_secured_at,now()),dispatch_customer_response_deadline_at=null,dispatch_last_transition_at=now(),updated_at=now() where id=r.id;
  if j.id is not null and not exists(select 1 from public.service_job_status_history where job_id=j.id and to_status='ACCEPTED') then insert into public.service_job_status_history(job_id,from_status,to_status,actor_role,actor_user_id,note) values(j.id,null,'ACCEPTED','PROVIDER',new.provider_user_id,'Provider accepted ranked dispatch offer'); end if;
  insert into public.request_status_history(request_id,from_status,to_status,actor_type,note) values(r.id,v_old,'ACCEPTED','PROVIDER','Provider accepted ranked dispatch offer');
 elsif new.status='DECLINED' then
  update public.request_provider_dispatch_offers set status='DECLINED',responded_at=coalesce(responded_at,now()),updated_at=now() where id=o.id;
  insert into public.request_status_history(request_id,from_status,to_status,actor_type,note) values(r.id,r.status,r.status,'PROVIDER','Provider declined ranked dispatch offer #'||o.sequence_no);perform public.advance_provider_offer(r.id);
 end if;return new;
end $$;
revoke all on function public.finalize_ranked_provider_response() from public,anon,authenticated;
drop trigger if exists trg_finalize_ranked_provider_response on public.request_provider_responses;
create trigger trg_finalize_ranked_provider_response after insert or update of status on public.request_provider_responses for each row execute function public.finalize_ranked_provider_response();

create or replace function public.prevent_request_status_regression() returns trigger language plpgsql set search_path='public' as $$ begin if old.status in ('ACCEPTED','INSPECTION_SCHEDULED','IN_PROGRESS','COMPLETED') and new.status in ('PENDING','RESPONDED') then new.status:=old.status;end if;return new;end $$;
drop trigger if exists trg_prevent_request_status_regression on public.request_intake;
create trigger trg_prevent_request_status_regression before update of status on public.request_intake for each row execute function public.prevent_request_status_regression();

create or replace function public.suppress_stale_request_history() returns trigger language plpgsql set search_path='public' as $$ declare v_current text;begin if new.to_status in ('PENDING','RESPONDED') then select status into v_current from public.request_intake where id=new.request_id;if v_current in ('ACCEPTED','INSPECTION_SCHEDULED','IN_PROGRESS','COMPLETED') then return null;end if;end if;return new;end $$;
drop trigger if exists trg_suppress_stale_request_history on public.request_status_history;
create trigger trg_suppress_stale_request_history before insert on public.request_status_history for each row execute function public.suppress_stale_request_history();

do $$ begin if exists(select 1 from cron.job where jobname='fixit-provider-offer-progression') then perform cron.unschedule('fixit-provider-offer-progression');end if;perform cron.schedule('fixit-provider-offer-progression','* * * * *','select public.process_provider_offer_progression();');end $$;
