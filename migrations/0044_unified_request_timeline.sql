-- Canonical request/job activity timeline assembled from authoritative workflow records.
-- The function is service-role only; caller-facing authorization is enforced by the request-timeline Edge Function.

CREATE OR REPLACE FUNCTION public.get_request_timeline(
  p_request_id uuid,
  p_viewer_role text DEFAULT 'ADMIN',
  p_viewer_user_id uuid DEFAULT NULL
)
RETURNS TABLE(
  event_id text,
  event_type text,
  title text,
  detail text,
  actor_role text,
  occurred_at timestamptz,
  source text,
  metadata jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path=public
AS $$
WITH timeline AS (
  SELECT 'request-created:'||r.id::text,'REQUEST_CREATED','Request created',r.service_name::text,'CUSTOMER',r.created_at,'request_intake',jsonb_build_object('status',r.status,'ticketNumber',r.ticket_number),'ALL'::text,r.customer_auth_user_id
  FROM public.request_intake r WHERE r.id=p_request_id

  UNION ALL
  SELECT 'request-status:'||h.id::text,'REQUEST_STATUS_CHANGED',
    CASE WHEN h.to_status='RESPONDED' THEN 'Provider response received' WHEN h.to_status='ACCEPTED' THEN 'Provider selected' WHEN h.to_status='INSPECTION_SCHEDULED' THEN 'Inspection scheduled' WHEN h.to_status IN ('PROCESSING','IN_PROGRESS') THEN 'Work started' WHEN h.to_status='COMPLETED' THEN 'Work completed' WHEN h.to_status='CANCELLED' THEN 'Request cancelled' ELSE initcap(replace(lower(h.to_status),'_',' ')) END,
    coalesce(nullif(h.note,''),coalesce(h.from_status||' → ','')||h.to_status),h.actor_type::text,h.created_at,'request_status_history',jsonb_build_object('fromStatus',h.from_status,'toStatus',h.to_status),'ALL',NULL::uuid
  FROM public.request_status_history h WHERE h.request_id=p_request_id

  UNION ALL
  SELECT 'provider-response:'||pr.id::text||':'||pr.status,
    CASE pr.status WHEN 'INTERESTED' THEN 'PROVIDER_INTERESTED' WHEN 'SELECTED' THEN 'PROVIDER_SELECTED' WHEN 'DECLINED' THEN 'PROVIDER_DECLINED' WHEN 'WITHDRAWN' THEN 'PROVIDER_WITHDREW' ELSE 'PROVIDER_RESPONSE' END,
    CASE pr.status WHEN 'INTERESTED' THEN 'Provider is interested' WHEN 'SELECTED' THEN 'Provider selected' WHEN 'DECLINED' THEN 'Provider declined request' WHEN 'WITHDRAWN' THEN 'Provider withdrew interest' ELSE 'Provider response updated' END,
    nullif(pr.provider_message,''),'PROVIDER',coalesce(pr.selected_at,pr.responded_at,pr.updated_at,pr.created_at),'request_provider_responses',jsonb_build_object('status',pr.status,'providerUserId',pr.provider_user_id),
    CASE WHEN pr.status IN ('INTERESTED','SELECTED') THEN 'CUSTOMER_PROVIDER_ADMIN' ELSE 'PROVIDER_ADMIN' END,pr.provider_user_id
  FROM public.request_provider_responses pr WHERE pr.request_id=p_request_id

  UNION ALL
  SELECT 'dispatch-start:'||r.id::text||':'||coalesce(r.dispatch_attempt,1)::text,'DISPATCH_STARTED',CASE WHEN coalesce(r.dispatch_attempt,1)>1 THEN 'Provider search restarted' ELSE 'Searching for providers' END,CASE WHEN r.dispatch_tier IS NULL THEN NULL ELSE 'Priority: '||initcap(lower(r.dispatch_tier)) END,'SYSTEM',r.dispatch_started_at,'request_intake',jsonb_build_object('attempt',r.dispatch_attempt,'tier',r.dispatch_tier),'ALL',NULL::uuid
  FROM public.request_intake r WHERE r.id=p_request_id AND r.dispatch_started_at IS NOT NULL

  UNION ALL
  SELECT 'dispatch-extended:'||r.id::text||':'||coalesce(r.dispatch_attempt,1)::text,'DISPATCH_EXTENDED','Provider search extended','No provider accepted during the initial search window.','SYSTEM',r.dispatch_extended_at,'request_intake',jsonb_build_object('attempt',r.dispatch_attempt,'deadline',r.dispatch_extension_deadline_at),'ALL',NULL::uuid
  FROM public.request_intake r WHERE r.id=p_request_id AND r.dispatch_extended_at IS NOT NULL

  UNION ALL
  SELECT 'dispatch-secured:'||r.id::text||':'||coalesce(r.dispatch_attempt,1)::text,'DISPATCH_SECURED','Provider secured',r.assigned_provider_label::text,'SYSTEM',r.dispatch_secured_at,'request_intake',jsonb_build_object('attempt',r.dispatch_attempt,'providerUserId',r.assigned_provider_user_id),'ALL',NULL::uuid
  FROM public.request_intake r WHERE r.id=p_request_id AND r.dispatch_secured_at IS NOT NULL

  UNION ALL
  SELECT 'dispatch-exhausted:'||r.id::text||':'||coalesce(r.dispatch_attempt,1)::text,'DISPATCH_EXHAUSTED','No provider available','The provider search completed without an available provider.','SYSTEM',r.dispatch_exhausted_at,'request_intake',jsonb_build_object('attempt',r.dispatch_attempt),'ALL',NULL::uuid
  FROM public.request_intake r WHERE r.id=p_request_id AND r.dispatch_exhausted_at IS NOT NULL

  UNION ALL
  SELECT 'customer-timeout:'||r.id::text||':'||coalesce(r.dispatch_attempt,1)::text,'CUSTOMER_RESPONSE_TIMEOUT','Provider selection timed out','The provider-selection response window expired.','SYSTEM',r.dispatch_customer_failed_at,'request_intake',jsonb_build_object('attempt',r.dispatch_attempt,'retryCount',r.dispatch_customer_retry_count),'CUSTOMER_ADMIN',r.customer_auth_user_id
  FROM public.request_intake r WHERE r.id=p_request_id AND r.dispatch_customer_failed_at IS NOT NULL

  UNION ALL
  SELECT 'inspection-created:'||i.id::text,'INSPECTION_CREATED',CASE WHEN i.scheduled_start IS NULL THEN 'Inspection requested' ELSE 'Inspection scheduled' END,CASE WHEN i.scheduled_start IS NULL THEN NULL ELSE 'Scheduled for '||to_char(i.scheduled_start,'YYYY-MM-DD HH24:MI TZ') END,CASE WHEN i.scheduled_start IS NULL THEN 'CUSTOMER' ELSE 'PROVIDER' END,i.created_at,'request_inspections',jsonb_build_object('status',i.status,'scheduledStart',i.scheduled_start,'durationMinutes',i.duration_minutes),'ALL',i.provider_user_id
  FROM public.request_inspections i WHERE i.request_id=p_request_id

  UNION ALL
  SELECT 'inspection-state:'||i.id::text||':'||i.status,'INSPECTION_'||i.status,CASE i.status WHEN 'ON_WAY' THEN 'Provider is on the way' WHEN 'ARRIVED' THEN 'Provider arrived' WHEN 'INSPECTING' THEN 'Inspection started' WHEN 'ESTIMATE_SENT' THEN 'Inspection completed' WHEN 'COMPLETED' THEN 'Inspection closed' ELSE initcap(replace(lower(i.status),'_',' ')) END,nullif(i.provider_note,''),'PROVIDER',i.updated_at,'request_inspections',jsonb_build_object('status',i.status),'ALL',i.provider_user_id
  FROM public.request_inspections i WHERE i.request_id=p_request_id AND i.updated_at>i.created_at

  UNION ALL
  SELECT 'estimate-sent:'||e.id::text,'ESTIMATE_SENT','Estimate sent',e.currency||' '||trim(to_char(e.total_amount,'FM999999990.00')),'PROVIDER',e.sent_at,'request_estimates',jsonb_build_object('status',e.status,'totalAmount',e.total_amount,'currency',e.currency),'ALL',e.provider_user_id
  FROM public.request_estimates e WHERE e.request_id=p_request_id AND e.sent_at IS NOT NULL

  UNION ALL
  SELECT 'estimate-decision:'||e.id::text||':'||e.status,CASE WHEN e.status='APPROVED' THEN 'ESTIMATE_APPROVED' WHEN e.status='DECLINED' THEN 'ESTIMATE_DECLINED' ELSE 'ESTIMATE_DECIDED' END,CASE WHEN e.status='APPROVED' THEN 'Estimate approved' WHEN e.status='DECLINED' THEN 'Estimate declined' ELSE 'Estimate decision recorded' END,nullif(e.customer_note,''),'CUSTOMER',e.decided_at,'request_estimates',jsonb_build_object('status',e.status,'totalAmount',e.total_amount,'currency',e.currency),'ALL',NULL::uuid
  FROM public.request_estimates e WHERE e.request_id=p_request_id AND e.decided_at IS NOT NULL

  UNION ALL
  SELECT 'completion-submitted:'||c.id::text,'COMPLETION_SUBMITTED','Provider submitted completion',c.currency||' '||trim(to_char(c.final_amount,'FM999999990.00')),'PROVIDER',c.submitted_at,'request_work_completions',jsonb_build_object('status',c.status,'finalAmount',c.final_amount,'currency',c.currency),'ALL',c.provider_user_id
  FROM public.request_work_completions c WHERE c.request_id=p_request_id AND c.submitted_at IS NOT NULL

  UNION ALL
  SELECT 'completion-confirmed:'||c.id::text,'COMPLETION_CONFIRMED','Customer confirmed completion',NULL::text,'CUSTOMER',c.confirmed_at,'request_work_completions',jsonb_build_object('status',c.status),'ALL',NULL::uuid
  FROM public.request_work_completions c WHERE c.request_id=p_request_id AND c.confirmed_at IS NOT NULL

  UNION ALL
  SELECT 'issue-reported:'||c.id::text,'ISSUE_REPORTED','Problem reported after service',nullif(c.issue_note,''),'CUSTOMER',c.issue_reported_at,'request_work_completions',jsonb_build_object('status',c.status),'ALL',NULL::uuid
  FROM public.request_work_completions c WHERE c.request_id=p_request_id AND c.issue_reported_at IS NOT NULL

  UNION ALL
  SELECT 'review:'||rv.id::text,'RATING_SUBMITTED','Customer rating submitted',CASE WHEN rv.overall_rating IS NULL THEN NULL ELSE trim(to_char(rv.overall_rating,'FM9.00'))||' / 5' END,'CUSTOMER',rv.created_at,'request_reviews',jsonb_build_object('quality',rv.quality_rating,'time',rv.time_rating,'cost',rv.cost_rating,'overall',rv.overall_rating),'ALL',rv.customer_user_id
  FROM public.request_reviews rv WHERE rv.request_id=p_request_id
)
SELECT event_id,event_type,title,detail,actor_role,occurred_at,source,metadata
FROM timeline
WHERE occurred_at IS NOT NULL
AND (
  visibility='ALL'
  OR upper(coalesce(p_viewer_role,'ADMIN'))='ADMIN'
  OR (upper(coalesce(p_viewer_role,''))='CUSTOMER' AND visibility IN ('CUSTOMER_ADMIN','CUSTOMER_PROVIDER_ADMIN'))
  OR (upper(coalesce(p_viewer_role,''))='PROVIDER' AND visibility IN ('PROVIDER_ADMIN','CUSTOMER_PROVIDER_ADMIN') AND (owner_user_id IS NULL OR owner_user_id=p_viewer_user_id))
)
ORDER BY occurred_at ASC,event_id ASC;
$$;

REVOKE ALL ON FUNCTION public.get_request_timeline(uuid,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_request_timeline(uuid,text,uuid) TO service_role;
