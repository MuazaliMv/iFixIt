-- Automated provider dispatch timeout state machine.
-- URGENT: 30 minutes, STANDARD: 1 hour, SCHEDULED: 2 hours.
-- Exactly one 1-hour extension is allowed before exhaustion.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

ALTER TABLE public.request_intake DROP CONSTRAINT IF EXISTS request_intake_urgency_check;
ALTER TABLE public.request_intake ADD CONSTRAINT request_intake_urgency_check
  CHECK (urgency IS NULL OR urgency IN ('URGENT','STANDARD','SCHEDULE','SCHEDULED'));

ALTER TABLE public.request_intake
  ADD COLUMN IF NOT EXISTS dispatch_tier TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_state TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_attempt INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dispatch_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatch_initial_deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatch_extended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatch_extension_deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatch_secured_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatch_exhausted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatch_last_transition_at TIMESTAMPTZ;

ALTER TABLE public.request_intake DROP CONSTRAINT IF EXISTS request_intake_dispatch_tier_valid;
ALTER TABLE public.request_intake ADD CONSTRAINT request_intake_dispatch_tier_valid
  CHECK (dispatch_tier IS NULL OR dispatch_tier IN ('URGENT','STANDARD','SCHEDULED'));
ALTER TABLE public.request_intake DROP CONSTRAINT IF EXISTS request_intake_dispatch_state_valid;
ALTER TABLE public.request_intake ADD CONSTRAINT request_intake_dispatch_state_valid
  CHECK (dispatch_state IS NULL OR dispatch_state IN ('SEARCHING','EXTENDED','SECURED','EXHAUSTED','CANCELLED','NOT_REQUIRED'));

CREATE TABLE IF NOT EXISTS public.customer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.request_intake(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  dispatch_attempt INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_notifications_dispatch_attempt
  ON public.customer_notifications(request_id,notification_type,dispatch_attempt)
  WHERE request_id IS NOT NULL AND dispatch_attempt IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_notifications_user_created
  ON public.customer_notifications(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_intake_dispatch_due
  ON public.request_intake(dispatch_state,dispatch_initial_deadline_at,dispatch_extension_deadline_at)
  WHERE dispatch_state IN ('SEARCHING','EXTENDED');

CREATE OR REPLACE FUNCTION public.dispatch_tier_for_urgency(p_urgency TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path=public AS $$
  SELECT CASE upper(coalesce(p_urgency,'STANDARD'))
    WHEN 'URGENT' THEN 'URGENT'
    WHEN 'SCHEDULE' THEN 'SCHEDULED'
    WHEN 'SCHEDULED' THEN 'SCHEDULED'
    ELSE 'STANDARD' END
$$;

CREATE OR REPLACE FUNCTION public.dispatch_window_for_tier(p_tier TEXT)
RETURNS INTERVAL LANGUAGE sql IMMUTABLE SET search_path=public AS $$
  SELECT CASE upper(coalesce(p_tier,'STANDARD'))
    WHEN 'URGENT' THEN interval '30 minutes'
    WHEN 'SCHEDULED' THEN interval '2 hours'
    ELSE interval '1 hour' END
$$;

CREATE OR REPLACE FUNCTION public.initialize_request_dispatch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_tier TEXT; v_now TIMESTAMPTZ := coalesce(new.created_at,now());
BEGIN
  IF new.status='CANCELLED' THEN
    new.dispatch_tier:=public.dispatch_tier_for_urgency(new.urgency);
    new.dispatch_state:='CANCELLED'; new.dispatch_attempt:=greatest(new.dispatch_attempt,1);
    new.dispatch_last_transition_at:=now(); RETURN new;
  END IF;
  IF new.status NOT IN ('PENDING','RESPONDED') THEN new.dispatch_state:=coalesce(new.dispatch_state,'NOT_REQUIRED'); RETURN new; END IF;
  IF new.dispatch_state IS NULL THEN
    v_tier:=public.dispatch_tier_for_urgency(new.urgency);
    new.dispatch_tier:=v_tier; new.dispatch_state:='SEARCHING'; new.dispatch_attempt:=1;
    new.dispatch_started_at:=v_now; new.dispatch_initial_deadline_at:=v_now+public.dispatch_window_for_tier(v_tier);
    new.dispatch_extended_at:=NULL; new.dispatch_extension_deadline_at:=NULL; new.dispatch_secured_at:=NULL; new.dispatch_exhausted_at:=NULL; new.dispatch_last_transition_at:=v_now;
  END IF;
  RETURN new;
END $$;
DROP TRIGGER IF EXISTS trg_initialize_request_dispatch ON public.request_intake;
CREATE TRIGGER trg_initialize_request_dispatch BEFORE INSERT ON public.request_intake
FOR EACH ROW EXECUTE FUNCTION public.initialize_request_dispatch();

CREATE OR REPLACE FUNCTION public.sync_request_dispatch_terminal_state()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF new.status='CANCELLED' AND old.status IS DISTINCT FROM 'CANCELLED' THEN
    new.dispatch_state:='CANCELLED'; new.dispatch_last_transition_at:=now();
  ELSIF new.assigned_provider_user_id IS NOT NULL AND coalesce(new.dispatch_state,'') IN ('SEARCHING','EXTENDED','EXHAUSTED') THEN
    new.dispatch_state:='SECURED'; new.dispatch_secured_at:=coalesce(new.dispatch_secured_at,now()); new.dispatch_last_transition_at:=now();
  END IF;
  RETURN new;
END $$;
DROP TRIGGER IF EXISTS trg_sync_request_dispatch_terminal_state ON public.request_intake;
CREATE TRIGGER trg_sync_request_dispatch_terminal_state BEFORE UPDATE ON public.request_intake
FOR EACH ROW EXECUTE FUNCTION public.sync_request_dispatch_terminal_state();

CREATE OR REPLACE FUNCTION public.guard_and_secure_provider_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_state TEXT;
BEGIN
  IF new.status='INTERESTED' THEN
    SELECT dispatch_state INTO v_state FROM public.request_intake WHERE id=new.request_id FOR UPDATE;
    IF v_state NOT IN ('SEARCHING','EXTENDED') THEN RAISE EXCEPTION 'Provider search is not active for this request'; END IF;
    UPDATE public.request_intake SET dispatch_state='SECURED',dispatch_secured_at=coalesce(dispatch_secured_at,now()),dispatch_last_transition_at=now()
      WHERE id=new.request_id AND dispatch_state IN ('SEARCHING','EXTENDED');
  END IF;
  RETURN new;
END $$;
DROP TRIGGER IF EXISTS trg_guard_and_secure_provider_response ON public.request_provider_responses;
CREATE TRIGGER trg_guard_and_secure_provider_response BEFORE INSERT OR UPDATE OF status ON public.request_provider_responses
FOR EACH ROW EXECUTE FUNCTION public.guard_and_secure_provider_response();

CREATE OR REPLACE FUNCTION public.process_dispatch_timeouts()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_extended INTEGER:=0; v_exhausted INTEGER:=0; v_cancelled INTEGER:=0; r RECORD;
BEGIN
  UPDATE public.request_intake SET dispatch_state='CANCELLED',dispatch_last_transition_at=now()
    WHERE status='CANCELLED' AND dispatch_state IN ('SEARCHING','EXTENDED','EXHAUSTED');
  GET DIAGNOSTICS v_cancelled=ROW_COUNT;

  FOR r IN SELECT id,customer_auth_user_id,dispatch_attempt FROM public.request_intake
    WHERE dispatch_state='SEARCHING' AND dispatch_initial_deadline_at<=now() AND assigned_provider_user_id IS NULL FOR UPDATE SKIP LOCKED LOOP
    IF EXISTS(SELECT 1 FROM public.request_provider_responses pr WHERE pr.request_id=r.id AND pr.status IN ('INTERESTED','SELECTED')) THEN
      UPDATE public.request_intake SET dispatch_state='SECURED',dispatch_secured_at=coalesce(dispatch_secured_at,now()),dispatch_last_transition_at=now() WHERE id=r.id;
    ELSE
      UPDATE public.request_intake SET dispatch_state='EXTENDED',dispatch_extended_at=now(),dispatch_extension_deadline_at=dispatch_initial_deadline_at+interval '1 hour',dispatch_last_transition_at=now() WHERE id=r.id;
      v_extended:=v_extended+1;
    END IF;
  END LOOP;

  FOR r IN SELECT id,customer_auth_user_id,dispatch_attempt FROM public.request_intake
    WHERE dispatch_state='EXTENDED' AND dispatch_extension_deadline_at<=now() AND assigned_provider_user_id IS NULL FOR UPDATE SKIP LOCKED LOOP
    IF EXISTS(SELECT 1 FROM public.request_provider_responses pr WHERE pr.request_id=r.id AND pr.status IN ('INTERESTED','SELECTED')) THEN
      UPDATE public.request_intake SET dispatch_state='SECURED',dispatch_secured_at=coalesce(dispatch_secured_at,now()),dispatch_last_transition_at=now() WHERE id=r.id;
    ELSE
      UPDATE public.request_intake SET dispatch_state='EXHAUSTED',dispatch_exhausted_at=now(),dispatch_last_transition_at=now() WHERE id=r.id;
      IF r.customer_auth_user_id IS NOT NULL THEN
        INSERT INTO public.customer_notifications(user_id,request_id,notification_type,title,message,dispatch_attempt)
        VALUES(r.customer_auth_user_id,r.id,'DISPATCH_NO_PROVIDER','No providers available','We''re sorry, but there are no available providers at this time.',r.dispatch_attempt)
        ON CONFLICT DO NOTHING;
      END IF;
      v_exhausted:=v_exhausted+1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('extended',v_extended,'exhausted',v_exhausted,'cancelled',v_cancelled,'processed_at',now());
END $$;

CREATE OR REPLACE FUNCTION public.retry_request_dispatch(p_ticket TEXT,p_customer_user_id UUID)
RETURNS public.request_intake LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.request_intake%rowtype; v_tier TEXT; v_now TIMESTAMPTZ:=now();
BEGIN
  SELECT * INTO r FROM public.request_intake WHERE ticket_number=upper(btrim(p_ticket)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF r.customer_auth_user_id IS DISTINCT FROM p_customer_user_id THEN RAISE EXCEPTION 'Request does not belong to customer'; END IF;
  IF r.status='CANCELLED' THEN RAISE EXCEPTION 'Cancelled requests cannot be retried'; END IF;
  IF r.assigned_provider_user_id IS NOT NULL OR r.status NOT IN ('PENDING','RESPONDED') THEN RAISE EXCEPTION 'Request can only be retried before provider selection'; END IF;
  IF r.dispatch_state<>'EXHAUSTED' THEN RAISE EXCEPTION 'Dispatch can only be retried after the previous search has ended'; END IF;
  v_tier:=public.dispatch_tier_for_urgency(r.urgency);
  UPDATE public.request_intake SET dispatch_tier=v_tier,dispatch_state='SEARCHING',dispatch_attempt=dispatch_attempt+1,
    dispatch_started_at=v_now,dispatch_initial_deadline_at=v_now+public.dispatch_window_for_tier(v_tier),dispatch_extended_at=NULL,
    dispatch_extension_deadline_at=NULL,dispatch_secured_at=NULL,dispatch_exhausted_at=NULL,dispatch_last_transition_at=v_now,updated_at=v_now
    WHERE id=r.id RETURNING * INTO r;
  RETURN r;
END $$;

REVOKE ALL ON FUNCTION public.retry_request_dispatch(TEXT,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.retry_request_dispatch(TEXT,UUID) TO service_role;
REVOKE ALL ON FUNCTION public.process_dispatch_timeouts() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.process_dispatch_timeouts() TO service_role;
REVOKE ALL ON FUNCTION public.initialize_request_dispatch() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sync_request_dispatch_terminal_state() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.guard_and_secure_provider_response() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_request_dispatch() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_request_dispatch_terminal_state() TO service_role;
GRANT EXECUTE ON FUNCTION public.guard_and_secure_provider_response() TO service_role;

UPDATE public.request_intake r SET
  dispatch_tier=public.dispatch_tier_for_urgency(r.urgency),
  dispatch_state=CASE WHEN r.status='CANCELLED' THEN 'CANCELLED'
    WHEN r.assigned_provider_user_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.request_provider_responses pr WHERE pr.request_id=r.id AND pr.status IN ('INTERESTED','SELECTED')) THEN 'SECURED'
    WHEN r.status IN ('PENDING','RESPONDED') THEN 'SEARCHING' ELSE 'NOT_REQUIRED' END,
  dispatch_attempt=CASE WHEN r.status IN ('PENDING','RESPONDED','CANCELLED') THEN greatest(r.dispatch_attempt,1) ELSE r.dispatch_attempt END,
  dispatch_started_at=CASE WHEN r.status IN ('PENDING','RESPONDED') AND r.dispatch_started_at IS NULL THEN now() ELSE r.dispatch_started_at END,
  dispatch_initial_deadline_at=CASE WHEN r.status IN ('PENDING','RESPONDED') AND r.assigned_provider_user_id IS NULL
    AND NOT EXISTS(SELECT 1 FROM public.request_provider_responses pr WHERE pr.request_id=r.id AND pr.status IN ('INTERESTED','SELECTED'))
    THEN now()+public.dispatch_window_for_tier(public.dispatch_tier_for_urgency(r.urgency)) ELSE r.dispatch_initial_deadline_at END,
  dispatch_last_transition_at=coalesce(r.dispatch_last_transition_at,now())
WHERE r.dispatch_state IS NULL;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='fixit-dispatch-timeouts';
SELECT cron.schedule('fixit-dispatch-timeouts','* * * * *',$$SELECT public.process_dispatch_timeouts();$$);
