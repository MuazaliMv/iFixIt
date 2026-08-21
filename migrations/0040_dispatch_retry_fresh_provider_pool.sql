-- A customer retry restarts the entire dispatch cycle and reopens the provider pool.
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

  DELETE FROM public.request_provider_responses
    WHERE request_id=r.id AND status IN ('DECLINED','WITHDRAWN');

  v_tier:=public.dispatch_tier_for_urgency(r.urgency);
  UPDATE public.request_intake SET
    status='PENDING',dispatch_tier=v_tier,dispatch_state='SEARCHING',dispatch_attempt=dispatch_attempt+1,
    dispatch_started_at=v_now,dispatch_initial_deadline_at=v_now+public.dispatch_window_for_tier(v_tier),
    dispatch_extended_at=NULL,dispatch_extension_deadline_at=NULL,dispatch_secured_at=NULL,dispatch_exhausted_at=NULL,
    dispatch_last_transition_at=v_now,updated_at=v_now
  WHERE id=r.id RETURNING * INTO r;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.retry_request_dispatch(TEXT,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.retry_request_dispatch(TEXT,UUID) TO service_role;
