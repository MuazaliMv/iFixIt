BEGIN;

-- Canonical marketplace rule:
-- the first eligible provider who accepts a live ranked offer becomes the
-- assigned provider immediately. Customer confirmation is not part of the
-- acceptance path. Later provider/job lifecycle actions continue from ACCEPTED.

-- Repair requests left behind by the retired customer-selection flow. If an
-- eligible provider had already expressed interest, deterministically attach the
-- earliest response. This runs once and is safe because the request row is
-- locked and service_jobs is unique by request in the live schema.
DO $$
DECLARE
  r RECORD;
  v_provider UUID;
  v_label TEXT;
  v_job_id UUID;
  v_old_status TEXT;
BEGIN
  FOR r IN
    SELECT ri.id, ri.ticket_number, ri.status
    FROM public.request_intake ri
    WHERE ri.assigned_provider_user_id IS NULL
      AND ri.status IN ('PENDING','RESPONDED')
      AND ri.dispatch_state IN ('AWAITING_CUSTOMER','CUSTOMER_TIMEOUT')
    ORDER BY ri.created_at
    FOR UPDATE
  LOOP
    SELECT rpr.provider_user_id,
           COALESCE(pop.public_name,pop.business_name,ap.full_name,ap.email,'Provider')
      INTO v_provider,v_label
    FROM public.request_provider_responses rpr
    JOIN public.auth_profiles ap
      ON ap.user_id=rpr.provider_user_id
     AND ap.provider_approved=TRUE
    JOIN public.provider_onboarding_profiles pop
      ON pop.user_id=rpr.provider_user_id
     AND pop.onboarding_status='APPROVED'
    WHERE rpr.request_id=r.id
      AND rpr.status IN ('INTERESTED','SELECTED')
    ORDER BY rpr.responded_at,rpr.created_at,rpr.provider_user_id
    LIMIT 1;

    IF v_provider IS NOT NULL THEN
      v_old_status:=r.status;

      INSERT INTO public.service_jobs(
        request_id,ticket_number,provider_user_id,provider_label,status,accepted_at
      )
      SELECT r.id,r.ticket_number,v_provider,v_label,'ACCEPTED',now()
      WHERE NOT EXISTS (
        SELECT 1 FROM public.service_jobs sj WHERE sj.request_id=r.id
      )
      RETURNING id INTO v_job_id;

      IF v_job_id IS NULL THEN
        SELECT id INTO v_job_id
        FROM public.service_jobs
        WHERE request_id=r.id
        LIMIT 1;
      END IF;

      UPDATE public.request_intake
      SET status='ACCEPTED',
          assigned_provider_user_id=v_provider,
          assigned_provider_label=v_label,
          accepted_at=COALESCE(accepted_at,now()),
          dispatch_state='SECURED',
          dispatch_secured_at=COALESCE(dispatch_secured_at,now()),
          dispatch_customer_response_deadline_at=NULL,
          dispatch_customer_failed_at=NULL,
          dispatch_last_transition_at=now(),
          updated_at=now()
      WHERE id=r.id
        AND assigned_provider_user_id IS NULL;

      UPDATE public.request_provider_responses
      SET status=CASE WHEN provider_user_id=v_provider THEN 'SELECTED' ELSE 'NOT_SELECTED' END,
          selected_at=CASE WHEN provider_user_id=v_provider THEN COALESCE(selected_at,now()) ELSE selected_at END,
          updated_at=now()
      WHERE request_id=r.id
        AND status IN ('INTERESTED','SELECTED');

      IF v_job_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.service_job_status_history
        WHERE job_id=v_job_id AND to_status='ACCEPTED'
      ) THEN
        INSERT INTO public.service_job_status_history(
          job_id,from_status,to_status,actor_role,actor_user_id,note
        ) VALUES(
          v_job_id,NULL,'ACCEPTED','SYSTEM',v_provider,
          'Provider acceptance finalized automatically during flow reconciliation'
        );
      END IF;

      INSERT INTO public.request_status_history(
        request_id,from_status,to_status,actor_type,note
      ) VALUES(
        r.id,v_old_status,'ACCEPTED','SYSTEM',
        'Provider acceptance finalized automatically; customer confirmation removed'
      );
    END IF;
  END LOOP;
END $$;

-- Requests that were waiting only because of the old customer-response gate
-- resume provider search. Customer retry counters/deadlines are retired state.
UPDATE public.request_intake
SET dispatch_state=CASE
      WHEN dispatch_extension_deadline_at IS NOT NULL AND dispatch_extension_deadline_at>now() THEN 'EXTENDED'
      ELSE 'SEARCHING'
    END,
    dispatch_customer_contact_started_at=NULL,
    dispatch_customer_response_deadline_at=NULL,
    dispatch_customer_retry_count=0,
    dispatch_customer_last_contact_at=NULL,
    dispatch_customer_failed_at=NULL,
    dispatch_initial_deadline_at=CASE
      WHEN dispatch_initial_deadline_at IS NULL OR dispatch_initial_deadline_at<=now()
        THEN now()+interval '15 minutes'
      ELSE dispatch_initial_deadline_at
    END,
    dispatch_last_transition_at=now(),
    updated_at=now()
WHERE assigned_provider_user_id IS NULL
  AND status IN ('PENDING','RESPONDED')
  AND dispatch_state IN ('AWAITING_CUSTOMER','CUSTOMER_TIMEOUT');

-- Timeout processing now owns provider discovery only. There is no customer
-- selection/retry timer after providers respond. Ranked offer progression owns
-- provider acceptance; once a provider accepts, its trigger moves the request to
-- ACCEPTED/SECURED atomically.
CREATE OR REPLACE FUNCTION public.process_dispatch_timeouts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  v_extended INTEGER:=0;
  v_exhausted INTEGER:=0;
  v_cancelled INTEGER:=0;
  r RECORD;
BEGIN
  UPDATE public.request_intake
  SET dispatch_state='CANCELLED',
      dispatch_customer_response_deadline_at=NULL,
      dispatch_last_transition_at=now()
  WHERE status='CANCELLED'
    AND dispatch_state IN ('SEARCHING','EXTENDED','AWAITING_CUSTOMER','EXHAUSTED','CUSTOMER_TIMEOUT');
  GET DIAGNOSTICS v_cancelled=ROW_COUNT;

  FOR r IN
    SELECT id
    FROM public.request_intake
    WHERE dispatch_state='SEARCHING'
      AND dispatch_initial_deadline_at<=now()
      AND assigned_provider_user_id IS NULL
      AND status IN ('PENDING','RESPONDED')
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.request_intake
    SET dispatch_state='EXTENDED',
        dispatch_extended_at=COALESCE(dispatch_extended_at,now()),
        dispatch_extension_deadline_at=COALESCE(dispatch_extension_deadline_at,now()+interval '1 hour'),
        dispatch_customer_response_deadline_at=NULL,
        dispatch_last_transition_at=now(),
        updated_at=now()
    WHERE id=r.id;
    v_extended:=v_extended+1;
    PERFORM public.advance_provider_offer(r.id);
  END LOOP;

  FOR r IN
    SELECT id,customer_auth_user_id,dispatch_attempt
    FROM public.request_intake
    WHERE dispatch_state='EXTENDED'
      AND dispatch_extension_deadline_at<=now()
      AND assigned_provider_user_id IS NULL
      AND status IN ('PENDING','RESPONDED')
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.request_intake
    SET dispatch_state='EXHAUSTED',
        dispatch_exhausted_at=COALESCE(dispatch_exhausted_at,now()),
        dispatch_customer_response_deadline_at=NULL,
        dispatch_last_transition_at=now(),
        updated_at=now()
    WHERE id=r.id;

    IF r.customer_auth_user_id IS NOT NULL THEN
      INSERT INTO public.customer_notifications(
        user_id,request_id,notification_type,title,message,dispatch_attempt
      ) VALUES(
        r.customer_auth_user_id,r.id,'DISPATCH_NO_PROVIDER','No providers available',
        'No provider accepted this request during the search window. You can retry the search if you still need service.',
        r.dispatch_attempt
      ) ON CONFLICT DO NOTHING;
    END IF;
    v_exhausted:=v_exhausted+1;
  END LOOP;

  RETURN jsonb_build_object(
    'extended',v_extended,
    'exhausted',v_exhausted,
    'customer_retries',0,
    'customer_timeouts',0,
    'cancelled',v_cancelled,
    'processed_at',now()
  );
END $$;

-- Keep the legacy RPC name callable for old clients, but it can no longer create
-- a second assignment or introduce a customer-confirmation gate. It is
-- idempotent for the already-assigned provider and otherwise explains the new
-- automatic flow.
CREATE OR REPLACE FUNCTION public.customer_select_marketplace_provider(
  p_ticket TEXT,
  p_customer_user_id UUID,
  p_provider_user_id UUID
)
RETURNS public.service_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  r public.request_intake%ROWTYPE;
  j public.service_jobs%ROWTYPE;
BEGIN
  SELECT * INTO r
  FROM public.request_intake
  WHERE ticket_number=upper(btrim(p_ticket))
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF r.customer_auth_user_id IS DISTINCT FROM p_customer_user_id THEN
    RAISE EXCEPTION 'Request does not belong to customer';
  END IF;

  IF r.assigned_provider_user_id IS NOT NULL THEN
    IF r.assigned_provider_user_id IS DISTINCT FROM p_provider_user_id THEN
      RAISE EXCEPTION 'A provider is already assigned to this request';
    END IF;
    SELECT * INTO j FROM public.service_jobs WHERE request_id=r.id LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Assigned provider job is not available yet'; END IF;
    RETURN j;
  END IF;

  RAISE EXCEPTION 'Provider assignment is automatic after provider acceptance; customer selection is not required';
END $$;

REVOKE ALL ON FUNCTION public.process_dispatch_timeouts() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.process_dispatch_timeouts() TO service_role;
REVOKE ALL ON FUNCTION public.customer_select_marketplace_provider(TEXT,UUID,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.customer_select_marketplace_provider(TEXT,UUID,UUID) TO service_role;

COMMIT;
