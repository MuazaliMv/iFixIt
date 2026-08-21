BEGIN;

CREATE TABLE IF NOT EXISTS public.request_provider_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.request_intake(id) ON DELETE CASCADE,
  provider_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'INTERESTED' CHECK (status IN ('INTERESTED','SELECTED','NOT_SELECTED','WITHDRAWN')),
  provider_message text,
  responded_at timestamptz NOT NULL DEFAULT now(),
  selected_at timestamptz,
  provider_confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_id,provider_user_id)
);
CREATE INDEX IF NOT EXISTS idx_request_provider_responses_request ON public.request_provider_responses(request_id,status,responded_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_provider_responses_provider ON public.request_provider_responses(provider_user_id,status,responded_at DESC);
ALTER TABLE public.request_provider_responses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.request_provider_responses FROM anon,authenticated;

CREATE TABLE IF NOT EXISTS public.request_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES public.request_intake(id) ON DELETE CASCADE,
  provider_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  preferred_slots jsonb NOT NULL DEFAULT '[]'::jsonb,
  scheduled_start timestamptz,
  duration_minutes integer CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 15 AND 720),
  status text NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED','SCHEDULED','ON_WAY','ARRIVED','INSPECTING','ESTIMATE_SENT','COMPLETED','CANCELLED')),
  provider_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_request_inspections_provider_status ON public.request_inspections(provider_user_id,status,scheduled_start);
ALTER TABLE public.request_inspections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.request_inspections FROM anon,authenticated;

CREATE TABLE IF NOT EXISTS public.request_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES public.request_intake(id) ON DELETE CASCADE,
  inspection_id uuid REFERENCES public.request_inspections(id) ON DELETE SET NULL,
  provider_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  findings text NOT NULL,
  recommended_work text NOT NULL,
  estimated_minutes integer CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
  labour_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (labour_amount >= 0),
  material_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (material_amount >= 0),
  total_amount numeric(12,2) GENERATED ALWAYS AS (labour_amount+material_amount) STORED,
  currency text NOT NULL DEFAULT 'MVR',
  status text NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT','APPROVED','DECLINED','REVISED')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  customer_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_request_estimates_provider_status ON public.request_estimates(provider_user_id,status,sent_at DESC);
ALTER TABLE public.request_estimates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.request_estimates FROM anon,authenticated;

CREATE TABLE IF NOT EXISTS public.request_work_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES public.request_intake(id) ON DELETE CASCADE,
  provider_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  work_performed jsonb NOT NULL DEFAULT '[]'::jsonb,
  labour_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (labour_amount >= 0),
  material_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (material_amount >= 0),
  final_amount numeric(12,2) GENERATED ALWAYS AS (labour_amount+material_amount) STORED,
  currency text NOT NULL DEFAULT 'MVR',
  payment_note text NOT NULL DEFAULT 'Payment is handled outside iFixIt.',
  status text NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','CONFIRMED','ISSUE_REPORTED')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  issue_reported_at timestamptz,
  issue_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_request_work_completions_provider ON public.request_work_completions(provider_user_id,status,submitted_at DESC);
ALTER TABLE public.request_work_completions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.request_work_completions FROM anon,authenticated;

CREATE TABLE IF NOT EXISTS public.request_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES public.request_intake(id) ON DELETE CASCADE,
  customer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  provider_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  satisfied boolean,
  rating smallint CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  review_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_request_reviews_provider ON public.request_reviews(provider_user_id,created_at DESC);
ALTER TABLE public.request_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.request_reviews FROM anon,authenticated;

CREATE OR REPLACE FUNCTION public.touch_marketplace_journey_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_request_provider_responses_touch BEFORE UPDATE ON public.request_provider_responses FOR EACH ROW EXECUTE FUNCTION public.touch_marketplace_journey_updated_at();
CREATE TRIGGER trg_request_inspections_touch BEFORE UPDATE ON public.request_inspections FOR EACH ROW EXECUTE FUNCTION public.touch_marketplace_journey_updated_at();
CREATE TRIGGER trg_request_estimates_touch BEFORE UPDATE ON public.request_estimates FOR EACH ROW EXECUTE FUNCTION public.touch_marketplace_journey_updated_at();
CREATE TRIGGER trg_request_work_completions_touch BEFORE UPDATE ON public.request_work_completions FOR EACH ROW EXECUTE FUNCTION public.touch_marketplace_journey_updated_at();
CREATE TRIGGER trg_request_reviews_touch BEFORE UPDATE ON public.request_reviews FOR EACH ROW EXECUTE FUNCTION public.touch_marketplace_journey_updated_at();

CREATE OR REPLACE FUNCTION public.customer_select_marketplace_provider(p_ticket text,p_customer_user_id uuid,p_provider_user_id uuid)
RETURNS public.service_jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.request_intake%ROWTYPE; resp public.request_provider_responses%ROWTYPE; j public.service_jobs%ROWTYPE; provider_label text;
BEGIN
 SELECT * INTO r FROM public.request_intake WHERE ticket_number=upper(btrim(p_ticket)) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
 IF r.customer_auth_user_id IS DISTINCT FROM p_customer_user_id THEN RAISE EXCEPTION 'Request does not belong to customer'; END IF;
 IF r.status<>'NEW' THEN RAISE EXCEPTION 'Provider can only be selected while request is NEW'; END IF;
 SELECT * INTO resp FROM public.request_provider_responses WHERE request_id=r.id AND provider_user_id=p_provider_user_id AND status='INTERESTED' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Provider is not available for selection'; END IF;
 SELECT COALESCE(pop.public_name,ap.full_name,ap.email,'Provider') INTO provider_label FROM public.auth_profiles ap LEFT JOIN public.provider_onboarding_profiles pop ON pop.user_id=ap.user_id WHERE ap.user_id=p_provider_user_id AND ap.role='PROVIDER' AND ap.provider_approved=true;
 IF provider_label IS NULL THEN RAISE EXCEPTION 'Provider is no longer eligible'; END IF;
 INSERT INTO public.service_jobs(request_id,ticket_number,provider_user_id,provider_label,status,accepted_at) VALUES(r.id,r.ticket_number,p_provider_user_id,provider_label,'ACCEPTED',now()) RETURNING * INTO j;
 UPDATE public.request_intake SET status='ACCEPTED',assigned_provider_user_id=p_provider_user_id,assigned_provider_label=provider_label,accepted_at=j.accepted_at,updated_at=now() WHERE id=r.id;
 UPDATE public.request_provider_responses SET status=CASE WHEN provider_user_id=p_provider_user_id THEN 'SELECTED' ELSE 'NOT_SELECTED' END,selected_at=CASE WHEN provider_user_id=p_provider_user_id THEN now() ELSE selected_at END WHERE request_id=r.id AND status='INTERESTED';
 INSERT INTO public.service_job_status_history(job_id,from_status,to_status,actor_role,actor_user_id,note) VALUES(j.id,NULL,'ACCEPTED','SYSTEM',p_customer_user_id,'Customer selected provider after provider expressed interest');
 INSERT INTO public.request_status_history(request_id,from_status,to_status,actor_type,note) VALUES(r.id,'NEW','ACCEPTED','CUSTOMER','Customer selected provider');
 RETURN j;
END; $$;
REVOKE ALL ON FUNCTION public.customer_select_marketplace_provider(text,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.customer_select_marketplace_provider(text,uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.customer_approve_marketplace_estimate(p_ticket text,p_customer_user_id uuid,p_customer_note text DEFAULT NULL)
RETURNS public.service_jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.request_intake%ROWTYPE; e public.request_estimates%ROWTYPE; j public.service_jobs%ROWTYPE;
BEGIN
 SELECT * INTO r FROM public.request_intake WHERE ticket_number=upper(btrim(p_ticket)) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
 IF r.customer_auth_user_id IS DISTINCT FROM p_customer_user_id THEN RAISE EXCEPTION 'Request does not belong to customer'; END IF;
 IF r.status<>'ACCEPTED' THEN RAISE EXCEPTION 'Estimate can only be approved before work starts'; END IF;
 SELECT * INTO e FROM public.request_estimates WHERE request_id=r.id AND status IN ('SENT','REVISED') FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'No estimate is awaiting approval'; END IF;
 UPDATE public.request_estimates SET status='APPROVED',decided_at=now(),customer_note=p_customer_note WHERE id=e.id;
 SELECT * INTO j FROM public.service_jobs WHERE request_id=r.id FOR UPDATE;
 UPDATE public.service_jobs SET status='PROCESSING',processing_at=now() WHERE id=j.id RETURNING * INTO j;
 UPDATE public.request_intake SET status='PROCESSING',processing_at=j.processing_at,updated_at=now() WHERE id=r.id;
 INSERT INTO public.service_job_status_history(job_id,from_status,to_status,actor_role,actor_user_id,note) VALUES(j.id,'ACCEPTED','PROCESSING','SYSTEM',p_customer_user_id,'Customer approved estimate; work authorized');
 INSERT INTO public.request_status_history(request_id,from_status,to_status,actor_type,note) VALUES(r.id,'ACCEPTED','PROCESSING','CUSTOMER','Customer approved provider estimate');
 RETURN j;
END; $$;
REVOKE ALL ON FUNCTION public.customer_approve_marketplace_estimate(text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.customer_approve_marketplace_estimate(text,uuid,text) TO service_role;

COMMIT;
