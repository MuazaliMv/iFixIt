-- Live dispatch interaction layer.
-- Customers may select immediately or explicitly wait for another provider while discovery remains active.
-- Waiting is an explicit customer response, so the 15-minute non-response timer pauses until another provider arrives or the search threshold is reached.

ALTER TABLE public.request_intake
  ADD COLUMN IF NOT EXISTS dispatch_customer_mode TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_wait_provider_count INTEGER,
  ADD COLUMN IF NOT EXISTS dispatch_waiting_since TIMESTAMPTZ;

ALTER TABLE public.request_intake DROP CONSTRAINT IF EXISTS request_intake_dispatch_customer_mode_valid;
ALTER TABLE public.request_intake ADD CONSTRAINT request_intake_dispatch_customer_mode_valid
  CHECK (dispatch_customer_mode IS NULL OR dispatch_customer_mode IN ('WAITING_MORE'));
ALTER TABLE public.request_intake DROP CONSTRAINT IF EXISTS request_intake_dispatch_wait_count_valid;
ALTER TABLE public.request_intake ADD CONSTRAINT request_intake_dispatch_wait_count_valid
  CHECK (dispatch_wait_provider_count IS NULL OR dispatch_wait_provider_count BETWEEN 1 AND 4);
ALTER TABLE public.request_intake DROP CONSTRAINT IF EXISTS request_intake_dispatch_wait_mode_state_valid;
ALTER TABLE public.request_intake ADD CONSTRAINT request_intake_dispatch_wait_mode_state_valid
  CHECK (dispatch_customer_mode IS NULL OR dispatch_state IN ('SEARCHING','EXTENDED'));

CREATE INDEX IF NOT EXISTS idx_request_intake_dispatch_customer_wait
  ON public.request_intake(dispatch_customer_mode,dispatch_state,dispatch_customer_response_deadline_at)
  WHERE dispatch_state IN ('SEARCHING','EXTENDED','AWAITING_CUSTOMER');

CREATE OR REPLACE FUNCTION public.customer_wait_for_more_providers(p_ticket TEXT,p_customer_user_id UUID)
RETURNS public.request_intake LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.request_intake%rowtype; v_count INTEGER; v_now TIMESTAMPTZ:=now();
BEGIN
  SELECT * INTO r FROM public.request_intake WHERE ticket_number=upper(btrim(p_ticket)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF r.customer_auth_user_id IS DISTINCT FROM p_customer_user_id THEN RAISE EXCEPTION 'Request does not belong to customer'; END IF;
  IF r.status NOT IN ('PENDING','RESPONDED') OR r.assigned_provider_user_id IS NOT NULL THEN RAISE EXCEPTION 'Request is no longer awaiting provider selection'; END IF;
  IF r.dispatch_state NOT IN ('SEARCHING','EXTENDED') THEN RAISE EXCEPTION 'Provider search is not active'; END IF;
  SELECT count(*) INTO v_count FROM public.request_provider_responses WHERE request_id=r.id AND status='INTERESTED';
  IF v_count<1 THEN RAISE EXCEPTION 'No provider is available yet'; END IF;
  IF v_count>=5 THEN RAISE EXCEPTION 'Maximum provider options already available'; END IF;
  UPDATE public.request_intake SET
    dispatch_customer_mode='WAITING_MORE',dispatch_wait_provider_count=v_count,dispatch_waiting_since=v_now,
    dispatch_customer_contact_started_at=NULL,dispatch_customer_last_contact_at=v_now,
    dispatch_customer_response_deadline_at=NULL,dispatch_customer_retry_count=0,dispatch_customer_failed_at=NULL,
    dispatch_last_transition_at=v_now,updated_at=v_now
  WHERE id=r.id RETURNING * INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.sync_request_dispatch_terminal_state()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF new.status='CANCELLED' AND old.status IS DISTINCT FROM 'CANCELLED' THEN
    new.dispatch_state:='CANCELLED'; new.dispatch_customer_mode:=NULL; new.dispatch_wait_provider_count:=NULL; new.dispatch_waiting_since:=NULL;
    new.dispatch_customer_response_deadline_at:=NULL; new.dispatch_last_transition_at:=now();
  ELSIF new.assigned_provider_user_id IS NOT NULL AND coalesce(new.dispatch_state,'') IN ('SEARCHING','EXTENDED','AWAITING_CUSTOMER','EXHAUSTED','CUSTOMER_TIMEOUT') THEN
    new.dispatch_state:='SECURED'; new.dispatch_secured_at:=coalesce(new.dispatch_secured_at,now());
    new.dispatch_customer_mode:=NULL; new.dispatch_wait_provider_count:=NULL; new.dispatch_waiting_since:=NULL;
    new.dispatch_customer_response_deadline_at:=NULL; new.dispatch_last_transition_at:=now();
  END IF;
  RETURN new;
END $$;

CREATE OR REPLACE FUNCTION public.guard_and_secure_provider_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_state TEXT; v_user UUID; v_attempt INTEGER; v_count INTEGER; v_contact_started TIMESTAMPTZ;
  v_mode TEXT; v_wait_count INTEGER; v_existing_deadline TIMESTAMPTZ; v_existing_retry INTEGER;
BEGIN
  IF new.status <> 'INTERESTED' THEN RETURN new; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(new.request_id::text,0));
  SELECT dispatch_state,customer_auth_user_id,dispatch_attempt,dispatch_customer_contact_started_at,dispatch_customer_mode,
         dispatch_wait_provider_count,dispatch_customer_response_deadline_at,dispatch_customer_retry_count
    INTO v_state,v_user,v_attempt,v_contact_started,v_mode,v_wait_count,v_existing_deadline,v_existing_retry
  FROM public.request_intake WHERE id=new.request_id FOR UPDATE;
  IF v_state NOT IN ('SEARCHING','EXTENDED') THEN RAISE EXCEPTION 'Provider search is not active for this request'; END IF;
  SELECT count(*) INTO v_count FROM public.request_provider_responses pr
    WHERE pr.request_id=new.request_id AND pr.status IN ('INTERESTED','SELECTED') AND pr.id IS DISTINCT FROM new.id;
  IF v_count >= 5 THEN RAISE EXCEPTION 'Provider availability limit reached'; END IF;
  v_count:=v_count+1;

  IF v_mode='WAITING_MORE' AND v_count>coalesce(v_wait_count,0) THEN
    UPDATE public.request_intake SET dispatch_customer_mode=NULL,dispatch_wait_provider_count=NULL,dispatch_waiting_since=NULL,
      dispatch_customer_contact_started_at=now(),dispatch_customer_last_contact_at=now(),dispatch_customer_response_deadline_at=now()+interval '15 minutes',
      dispatch_customer_retry_count=0,dispatch_customer_failed_at=NULL,dispatch_last_transition_at=now()
    WHERE id=new.request_id;
    IF v_user IS NOT NULL THEN
      INSERT INTO public.customer_notifications(user_id,request_id,notification_type,title,message,dispatch_attempt)
      VALUES(v_user,new.request_id,'MORE_PROVIDER_OPTIONS_AVAILABLE_'||v_count,'More providers available','More providers are now available for your request. Review your options and select a provider within 15 minutes, or choose to wait again while the search remains active.',v_attempt)
      ON CONFLICT DO NOTHING;
    END IF;
    v_existing_deadline:=now()+interval '15 minutes'; v_existing_retry:=0; v_mode:=NULL;
  ELSIF v_contact_started IS NULL AND v_mode IS NULL THEN
    UPDATE public.request_intake SET dispatch_customer_contact_started_at=now(),dispatch_customer_last_contact_at=now(),
      dispatch_customer_response_deadline_at=now()+interval '15 minutes',dispatch_customer_retry_count=0,dispatch_customer_failed_at=NULL,dispatch_last_transition_at=now()
    WHERE id=new.request_id;
    IF v_user IS NOT NULL THEN
      INSERT INTO public.customer_notifications(user_id,request_id,notification_type,title,message,dispatch_attempt)
      VALUES(v_user,new.request_id,'PROVIDER_OPTIONS_AVAILABLE','Provider available','A provider is available for your request. Please review and select a provider within 15 minutes, or choose to wait for more providers.',v_attempt)
      ON CONFLICT DO NOTHING;
    END IF;
    v_existing_deadline:=now()+interval '15 minutes'; v_existing_retry:=0;
  END IF;

  IF v_count >= 5 THEN
    UPDATE public.request_intake SET dispatch_state='AWAITING_CUSTOMER',dispatch_customer_mode=NULL,dispatch_wait_provider_count=NULL,dispatch_waiting_since=NULL,
      dispatch_customer_contact_started_at=coalesce(dispatch_customer_contact_started_at,now()),dispatch_customer_last_contact_at=now(),
      dispatch_customer_response_deadline_at=CASE WHEN v_mode='WAITING_MORE' OR v_existing_deadline IS NULL THEN now()+interval '15 minutes' ELSE v_existing_deadline END,
      dispatch_customer_retry_count=CASE WHEN v_mode='WAITING_MORE' THEN 0 ELSE coalesce(v_existing_retry,0) END,
      dispatch_customer_failed_at=NULL,dispatch_last_transition_at=now()
    WHERE id=new.request_id;
    IF v_user IS NOT NULL THEN
      INSERT INTO public.customer_notifications(user_id,request_id,notification_type,title,message,dispatch_attempt)
      VALUES(v_user,new.request_id,'PROVIDER_CAP_REACHED','5 providers available','Five providers are available. The provider search has ended; please select one of the available providers.',v_attempt)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN new;
END $$;

CREATE OR REPLACE FUNCTION public.process_dispatch_timeouts()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_extended INTEGER:=0; v_exhausted INTEGER:=0; v_customer_retries INTEGER:=0; v_customer_timeouts INTEGER:=0; v_cancelled INTEGER:=0;
  v_count INTEGER; v_retry INTEGER; r RECORD;
BEGIN
  UPDATE public.request_intake SET dispatch_state='CANCELLED',dispatch_customer_mode=NULL,dispatch_wait_provider_count=NULL,dispatch_waiting_since=NULL,
    dispatch_customer_response_deadline_at=NULL,dispatch_last_transition_at=now()
    WHERE status='CANCELLED' AND dispatch_state IN ('SEARCHING','EXTENDED','AWAITING_CUSTOMER','EXHAUSTED','CUSTOMER_TIMEOUT');
  GET DIAGNOSTICS v_cancelled=ROW_COUNT;

  FOR r IN SELECT id,customer_auth_user_id,dispatch_attempt,dispatch_customer_mode,dispatch_customer_response_deadline_at,dispatch_customer_retry_count
    FROM public.request_intake WHERE dispatch_state='SEARCHING' AND dispatch_initial_deadline_at<=now() AND assigned_provider_user_id IS NULL FOR UPDATE SKIP LOCKED LOOP
    SELECT count(*) INTO v_count FROM public.request_provider_responses pr WHERE pr.request_id=r.id AND pr.status IN ('INTERESTED','SELECTED');
    IF v_count>0 THEN
      UPDATE public.request_intake SET dispatch_state='AWAITING_CUSTOMER',dispatch_customer_mode=NULL,dispatch_wait_provider_count=NULL,dispatch_waiting_since=NULL,
        dispatch_customer_contact_started_at=coalesce(dispatch_customer_contact_started_at,now()),dispatch_customer_last_contact_at=now(),
        dispatch_customer_response_deadline_at=CASE WHEN r.dispatch_customer_mode='WAITING_MORE' OR r.dispatch_customer_response_deadline_at IS NULL THEN now()+interval '15 minutes' ELSE r.dispatch_customer_response_deadline_at END,
        dispatch_customer_retry_count=CASE WHEN r.dispatch_customer_mode='WAITING_MORE' THEN 0 ELSE coalesce(r.dispatch_customer_retry_count,0) END,
        dispatch_customer_failed_at=NULL,dispatch_last_transition_at=now() WHERE id=r.id;
    ELSE
      UPDATE public.request_intake SET dispatch_state='EXTENDED',dispatch_extended_at=now(),dispatch_extension_deadline_at=dispatch_initial_deadline_at+interval '1 hour',dispatch_last_transition_at=now() WHERE id=r.id;
      v_extended:=v_extended+1;
    END IF;
  END LOOP;

  FOR r IN SELECT id,customer_auth_user_id,dispatch_attempt,dispatch_customer_mode,dispatch_customer_response_deadline_at,dispatch_customer_retry_count
    FROM public.request_intake WHERE dispatch_state='EXTENDED' AND dispatch_extension_deadline_at<=now() AND assigned_provider_user_id IS NULL FOR UPDATE SKIP LOCKED LOOP
    SELECT count(*) INTO v_count FROM public.request_provider_responses pr WHERE pr.request_id=r.id AND pr.status IN ('INTERESTED','SELECTED');
    IF v_count>0 THEN
      UPDATE public.request_intake SET dispatch_state='AWAITING_CUSTOMER',dispatch_customer_mode=NULL,dispatch_wait_provider_count=NULL,dispatch_waiting_since=NULL,
        dispatch_customer_contact_started_at=coalesce(dispatch_customer_contact_started_at,now()),dispatch_customer_last_contact_at=now(),
        dispatch_customer_response_deadline_at=CASE WHEN r.dispatch_customer_mode='WAITING_MORE' OR r.dispatch_customer_response_deadline_at IS NULL THEN now()+interval '15 minutes' ELSE r.dispatch_customer_response_deadline_at END,
        dispatch_customer_retry_count=CASE WHEN r.dispatch_customer_mode='WAITING_MORE' THEN 0 ELSE coalesce(r.dispatch_customer_retry_count,0) END,
        dispatch_customer_failed_at=NULL,dispatch_last_transition_at=now() WHERE id=r.id;
    ELSE
      UPDATE public.request_intake SET dispatch_state='EXHAUSTED',dispatch_exhausted_at=now(),dispatch_customer_mode=NULL,dispatch_wait_provider_count=NULL,dispatch_waiting_since=NULL,
        dispatch_customer_response_deadline_at=NULL,dispatch_last_transition_at=now() WHERE id=r.id;
      IF r.customer_auth_user_id IS NOT NULL THEN
        INSERT INTO public.customer_notifications(user_id,request_id,notification_type,title,message,dispatch_attempt)
        VALUES(r.customer_auth_user_id,r.id,'DISPATCH_NO_PROVIDER','No providers available','We''re sorry, but there are no available providers at this time.',r.dispatch_attempt)
        ON CONFLICT DO NOTHING;
      END IF;
      v_exhausted:=v_exhausted+1;
    END IF;
  END LOOP;

  FOR r IN SELECT id,customer_auth_user_id,dispatch_attempt,dispatch_customer_retry_count FROM public.request_intake
    WHERE dispatch_state IN ('SEARCHING','EXTENDED','AWAITING_CUSTOMER') AND status IN ('PENDING','RESPONDED') AND assigned_provider_user_id IS NULL
      AND dispatch_customer_mode IS NULL AND dispatch_customer_response_deadline_at IS NOT NULL AND dispatch_customer_response_deadline_at<=now()
      AND dispatch_customer_failed_at IS NULL FOR UPDATE SKIP LOCKED LOOP
    SELECT count(*) INTO v_count FROM public.request_provider_responses pr WHERE pr.request_id=r.id AND pr.status IN ('INTERESTED','SELECTED');
    IF v_count=0 THEN CONTINUE; END IF;
    v_retry:=coalesce(r.dispatch_customer_retry_count,0);
    IF v_retry<3 THEN
      v_retry:=v_retry+1;
      UPDATE public.request_intake SET dispatch_customer_retry_count=v_retry,dispatch_customer_last_contact_at=now(),dispatch_customer_response_deadline_at=now()+interval '15 minutes',dispatch_last_transition_at=now() WHERE id=r.id;
      IF r.customer_auth_user_id IS NOT NULL THEN
        INSERT INTO public.customer_notifications(user_id,request_id,notification_type,title,message,dispatch_attempt)
        VALUES(r.customer_auth_user_id,r.id,'CUSTOMER_RESPONSE_RETRY_'||v_retry,'Provider selection reminder','Providers are waiting for your response. Please review the available providers and make your selection, or choose to wait for more providers if the search is still active.',r.dispatch_attempt)
        ON CONFLICT DO NOTHING;
      END IF;
      v_customer_retries:=v_customer_retries+1;
    ELSE
      UPDATE public.request_intake SET dispatch_state='CUSTOMER_TIMEOUT',dispatch_customer_failed_at=now(),dispatch_customer_response_deadline_at=NULL,dispatch_last_transition_at=now() WHERE id=r.id;
      IF r.customer_auth_user_id IS NOT NULL THEN
        INSERT INTO public.customer_notifications(user_id,request_id,notification_type,title,message,dispatch_attempt)
        VALUES(r.customer_auth_user_id,r.id,'CUSTOMER_RESPONSE_TIMEOUT','Provider selection timed out','We couldn''t complete provider assignment because we didn''t receive your response after 3 retries. You can retry the search if you still need service.',r.dispatch_attempt)
        ON CONFLICT DO NOTHING;
      END IF;
      v_customer_timeouts:=v_customer_timeouts+1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('extended',v_extended,'exhausted',v_exhausted,'customer_retries',v_customer_retries,'customer_timeouts',v_customer_timeouts,'cancelled',v_cancelled,'processed_at',now());
END $$;

CREATE OR REPLACE FUNCTION public.retry_request_dispatch(p_ticket TEXT,p_customer_user_id UUID)
RETURNS public.request_intake LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.request_intake%rowtype; v_tier TEXT; v_now TIMESTAMPTZ:=now(); v_old_status TEXT;
BEGIN
  SELECT * INTO r FROM public.request_intake WHERE ticket_number=upper(btrim(p_ticket)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF r.customer_auth_user_id IS DISTINCT FROM p_customer_user_id THEN RAISE EXCEPTION 'Request does not belong to customer'; END IF;
  IF r.status='CANCELLED' THEN RAISE EXCEPTION 'Cancelled requests cannot be retried'; END IF;
  IF r.assigned_provider_user_id IS NOT NULL OR r.status NOT IN ('PENDING','RESPONDED') THEN RAISE EXCEPTION 'Request can only be retried before provider selection'; END IF;
  IF r.dispatch_state NOT IN ('EXHAUSTED','CUSTOMER_TIMEOUT') THEN RAISE EXCEPTION 'Dispatch can only be retried after the previous search has ended'; END IF;
  UPDATE public.request_provider_responses SET status='WITHDRAWN',updated_at=v_now WHERE request_id=r.id AND status='INTERESTED';
  v_tier:=public.dispatch_tier_for_urgency(r.urgency); v_old_status:=r.status;
  UPDATE public.request_intake SET status='PENDING',dispatch_tier=v_tier,dispatch_state='SEARCHING',dispatch_attempt=dispatch_attempt+1,
    dispatch_started_at=v_now,dispatch_initial_deadline_at=v_now+public.dispatch_window_for_tier(v_tier),dispatch_extended_at=NULL,dispatch_extension_deadline_at=NULL,
    dispatch_secured_at=NULL,dispatch_exhausted_at=NULL,dispatch_customer_contact_started_at=NULL,dispatch_customer_response_deadline_at=NULL,
    dispatch_customer_retry_count=0,dispatch_customer_last_contact_at=NULL,dispatch_customer_failed_at=NULL,dispatch_customer_mode=NULL,
    dispatch_wait_provider_count=NULL,dispatch_waiting_since=NULL,dispatch_last_transition_at=v_now,updated_at=v_now
    WHERE id=r.id RETURNING * INTO r;
  IF v_old_status IS DISTINCT FROM 'PENDING' THEN
    INSERT INTO public.request_status_history(request_id,from_status,to_status,actor_type,note)
    VALUES(r.id,v_old_status,'PENDING','CUSTOMER','Customer retried provider search');
  END IF;
  RETURN r;
END $$;

REVOKE ALL ON FUNCTION public.customer_wait_for_more_providers(TEXT,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.customer_wait_for_more_providers(TEXT,UUID) TO service_role;
REVOKE ALL ON FUNCTION public.guard_and_secure_provider_response() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guard_and_secure_provider_response() TO service_role;
REVOKE ALL ON FUNCTION public.process_dispatch_timeouts() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.process_dispatch_timeouts() TO service_role;
REVOKE ALL ON FUNCTION public.retry_request_dispatch(TEXT,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.retry_request_dispatch(TEXT,UUID) TO service_role;
REVOKE ALL ON FUNCTION public.sync_request_dispatch_terminal_state() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sync_request_dispatch_terminal_state() TO service_role;
