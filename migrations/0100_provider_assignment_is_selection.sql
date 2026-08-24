BEGIN;

-- A provider being attached to a request is the source-of-truth selection event.
-- Keep dispatch state and provider-response state synchronized automatically.

CREATE OR REPLACE FUNCTION public.sync_provider_assignment_before_request_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_provider_user_id IS NOT NULL THEN
    NEW.dispatch_state := 'SECURED';
    NEW.dispatch_secured_at := COALESCE(NEW.dispatch_secured_at, now());
    NEW.dispatch_customer_response_deadline_at := NULL;
    NEW.dispatch_last_transition_at := now();

    -- Do not regress requests that have already moved beyond acceptance.
    IF NEW.status IN ('NEW','PENDING','RESPONDED') THEN
      NEW.status := 'ACCEPTED';
      NEW.accepted_at := COALESCE(NEW.accepted_at, now());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_request_assignment_secures_dispatch ON public.request_intake;
CREATE TRIGGER trg_request_assignment_secures_dispatch
BEFORE INSERT OR UPDATE OF assigned_provider_user_id, status
ON public.request_intake
FOR EACH ROW
EXECUTE FUNCTION public.sync_provider_assignment_before_request_write();

CREATE OR REPLACE FUNCTION public.sync_selected_provider_response_after_request_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_provider_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- The attached provider is always recorded as SELECTED.
  UPDATE public.request_provider_responses
  SET status = 'SELECTED',
      selected_at = COALESCE(selected_at, now()),
      updated_at = now()
  WHERE request_id = NEW.id
    AND provider_user_id = NEW.assigned_provider_user_id
    AND status IS DISTINCT FROM 'SELECTED';

  -- Any other still-interested provider is no longer selectable.
  UPDATE public.request_provider_responses
  SET status = 'NOT_SELECTED',
      updated_at = now()
  WHERE request_id = NEW.id
    AND provider_user_id <> NEW.assigned_provider_user_id
    AND status = 'INTERESTED';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_request_assignment_marks_provider_selected ON public.request_intake;
CREATE TRIGGER trg_request_assignment_marks_provider_selected
AFTER INSERT OR UPDATE OF assigned_provider_user_id
ON public.request_intake
FOR EACH ROW
EXECUTE FUNCTION public.sync_selected_provider_response_after_request_write();

-- Repair existing requests where a provider is already attached but dispatch/provider-response
-- state was left behind by an older flow.
UPDATE public.request_intake
SET dispatch_state = 'SECURED',
    dispatch_secured_at = COALESCE(dispatch_secured_at, accepted_at, now()),
    dispatch_customer_response_deadline_at = NULL,
    dispatch_last_transition_at = now(),
    status = CASE WHEN status IN ('NEW','PENDING','RESPONDED') THEN 'ACCEPTED' ELSE status END,
    accepted_at = CASE
      WHEN status IN ('NEW','PENDING','RESPONDED') THEN COALESCE(accepted_at, now())
      ELSE accepted_at
    END,
    updated_at = now()
WHERE assigned_provider_user_id IS NOT NULL
  AND (
    dispatch_state IS DISTINCT FROM 'SECURED'
    OR dispatch_customer_response_deadline_at IS NOT NULL
    OR status IN ('NEW','PENDING','RESPONDED')
  );

UPDATE public.request_provider_responses rpr
SET status = 'SELECTED',
    selected_at = COALESCE(rpr.selected_at, now()),
    updated_at = now()
FROM public.request_intake ri
WHERE rpr.request_id = ri.id
  AND ri.assigned_provider_user_id IS NOT NULL
  AND rpr.provider_user_id = ri.assigned_provider_user_id
  AND rpr.status IS DISTINCT FROM 'SELECTED';

UPDATE public.request_provider_responses rpr
SET status = 'NOT_SELECTED',
    updated_at = now()
FROM public.request_intake ri
WHERE rpr.request_id = ri.id
  AND ri.assigned_provider_user_id IS NOT NULL
  AND rpr.provider_user_id <> ri.assigned_provider_user_id
  AND rpr.status = 'INTERESTED';

COMMIT;
