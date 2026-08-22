-- Customer/provider communication hardening.
-- Applied to production on 2026-08-22 before the UI rollout.

alter table public.request_messages
  add column if not exists sender_auth_user_id uuid,
  add column if not exists recipient_auth_user_id uuid,
  add column if not exists sender_mode text,
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz;

update public.request_messages m
set sender_auth_user_id = case
      when m.sender_role='CUSTOMER' then r.customer_auth_user_id
      when m.sender_role='PROVIDER' then r.assigned_provider_user_id
      else m.sender_auth_user_id end,
    recipient_auth_user_id = case
      when m.sender_role='CUSTOMER' then r.assigned_provider_user_id
      when m.sender_role='PROVIDER' then r.customer_auth_user_id
      else m.recipient_auth_user_id end,
    sender_mode = coalesce(m.sender_mode,m.sender_role)
from public.request_intake r
where r.id=m.request_id
  and r.assigned_provider_user_id is not null
  and r.customer_auth_user_id is not null
  and (m.sender_auth_user_id is null or m.recipient_auth_user_id is null or m.sender_mode is null);

create index if not exists idx_request_messages_request_created
  on public.request_messages(request_id, created_at);
create index if not exists idx_request_messages_recipient_unread
  on public.request_messages(recipient_auth_user_id, request_id, read_at, created_at);

alter table public.request_messages enable row level security;
drop policy if exists request_messages_participant_select on public.request_messages;
create policy request_messages_participant_select
on public.request_messages for select to authenticated
using (
  exists (
    select 1 from public.request_intake r
    where r.id=request_messages.request_id
      and r.assigned_provider_user_id is not null
      and ((select auth.uid())=r.customer_auth_user_id or (select auth.uid())=r.assigned_provider_user_id)
  )
);

grant select on public.request_messages to authenticated;
revoke insert, update, delete on public.request_messages from anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='request_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.request_messages';
  end if;
end $$;

create or replace function public.rank_request_providers(p_request_id uuid)
returns table(provider_user_id uuid,total_score numeric,score_breakdown jsonb)
language sql stable security definer set search_path to 'public'
as $function$
with req as (
 select r.*,sc.id category_id from public.request_intake r
 left join public.service_categories sc on sc.code=r.service_category_code and sc.is_active
 where r.id=p_request_id
), eligible as (
 select ap.user_id,pop.availability_status,req.service_island_id,
 exists(select 1 from public.provider_service_areas psa where psa.auth_user_id=ap.user_id and psa.is_active and psa.island_id=req.service_island_id and (psa.location_unit_id is null or psa.location_unit_id=req.service_location_unit_id)) exact_area
 from req join public.auth_profiles ap on ap.provider_approved=true and ap.role<>'ADMIN'
 join public.provider_onboarding_profiles pop on pop.user_id=ap.user_id and pop.onboarding_status='APPROVED' and coalesce(pop.accepting_leads,true)=true and coalesce(pop.availability_status,'')<>'UNAVAILABLE'
 join public.provider_service_categories psc on psc.provider_user_id=ap.user_id and psc.is_active and psc.category_id=req.category_id
 where req.category_id is not null
 and ap.user_id is distinct from req.customer_auth_user_id
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
select m.user_id,
 round(30+m.location_score+m.availability_score+m.rating_score+m.response_score+m.completion_score+m.workload_score+m.reliability_score,2),
 jsonb_build_object('service',30,'location',m.location_score,'availability',m.availability_score,'rating',m.rating_score,'response_speed',m.response_score,'completion_rate',m.completion_score,'workload',m.workload_score,'reliability',m.reliability_score)
from metrics m order by 2 desc,m.user_id
$function$;

revoke all on function public.rank_request_providers(uuid) from public, anon, authenticated;
grant execute on function public.rank_request_providers(uuid) to service_role;
