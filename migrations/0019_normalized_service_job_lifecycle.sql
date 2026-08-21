BEGIN;

CREATE TABLE public.service_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES public.request_intake(id) ON DELETE RESTRICT,
  ticket_number varchar(64) NOT NULL UNIQUE,
  provider_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  provider_label varchar(160) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'ACCEPTED' CHECK (status IN ('ACCEPTED','PROCESSING','COMPLETED')),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  processing_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(provider_label) <> ''),
  CHECK (processing_at IS NULL OR processing_at >= accepted_at),
  CHECK (completed_at IS NULL OR completed_at >= accepted_at)
);

CREATE INDEX idx_service_jobs_provider_status ON public.service_jobs(provider_user_id,status,updated_at DESC);
CREATE INDEX idx_service_jobs_request ON public.service_jobs(request_id);
ALTER TABLE public.service_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_jobs FROM anon, authenticated;

CREATE TABLE public.service_job_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.service_jobs(id) ON DELETE RESTRICT,
  from_status varchar(20),
  to_status varchar(20) NOT NULL CHECK (to_status IN ('ACCEPTED','PROCESSING','COMPLETED')),
  actor_role varchar(20) NOT NULL DEFAULT 'SYSTEM' CHECK (actor_role IN ('SYSTEM','PROVIDER','ADMIN')),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_service_job_history_job_time ON public.service_job_status_history(job_id,created_at DESC);
ALTER TABLE public.service_job_status_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_job_status_history FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.touch_service_jobs_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_service_jobs_updated_at BEFORE UPDATE ON public.service_jobs FOR EACH ROW EXECUTE FUNCTION public.touch_service_jobs_updated_at();

CREATE OR REPLACE FUNCTION public.service_job_transition_allowed(p_from text,p_to text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT CASE
  WHEN p_from='ACCEPTED' AND p_to='PROCESSING' THEN true
  WHEN p_from='PROCESSING' AND p_to='COMPLETED' THEN true
  ELSE false END;
$$;

CREATE OR REPLACE FUNCTION public.accept_service_job(p_ticket text,p_provider_user_id uuid,p_provider_label text)
RETURNS public.service_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.request_intake%ROWTYPE; j public.service_jobs%ROWTYPE;
BEGIN
 SELECT * INTO r FROM public.request_intake WHERE ticket_number=upper(btrim(p_ticket)) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
 IF r.status <> 'NEW' THEN RAISE EXCEPTION 'Request is no longer available'; END IF;
 IF r.assigned_provider_user_id IS NOT NULL AND r.assigned_provider_user_id <> p_provider_user_id THEN RAISE EXCEPTION 'Request is assigned to another provider'; END IF;
 INSERT INTO public.service_jobs(request_id,ticket_number,provider_user_id,provider_label,status,accepted_at)
 VALUES(r.id,r.ticket_number,p_provider_user_id,btrim(p_provider_label),'ACCEPTED',now())
 RETURNING * INTO j;
 UPDATE public.request_intake SET status='ACCEPTED',assigned_provider_user_id=p_provider_user_id,assigned_provider_label=btrim(p_provider_label),accepted_at=j.accepted_at,updated_at=now() WHERE id=r.id;
 INSERT INTO public.service_job_status_history(job_id,from_status,to_status,actor_role,actor_user_id,note) VALUES(j.id,NULL,'ACCEPTED','PROVIDER',p_provider_user_id,'Provider accepted matched request');
 INSERT INTO public.request_status_history(request_id,from_status,to_status,actor_type,note) VALUES(r.id,'NEW','ACCEPTED','PROVIDER','Provider accepted request');
 RETURN j;
END; $$;

CREATE OR REPLACE FUNCTION public.transition_service_job(p_ticket text,p_provider_user_id uuid,p_target_status text)
RETURNS public.service_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j public.service_jobs%ROWTYPE; old_status text; target text:=upper(btrim(p_target_status));
BEGIN
 SELECT * INTO j FROM public.service_jobs WHERE ticket_number=upper(btrim(p_ticket)) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Job not found'; END IF;
 IF j.provider_user_id <> p_provider_user_id THEN RAISE EXCEPTION 'Job belongs to another provider'; END IF;
 old_status:=j.status;
 IF NOT public.service_job_transition_allowed(old_status,target) THEN RAISE EXCEPTION 'Invalid job transition: % -> %',old_status,target; END IF;
 UPDATE public.service_jobs SET status=target,
   processing_at=CASE WHEN target='PROCESSING' THEN now() ELSE processing_at END,
   completed_at=CASE WHEN target='COMPLETED' THEN now() ELSE completed_at END
 WHERE id=j.id RETURNING * INTO j;
 UPDATE public.request_intake SET status=target,
   processing_at=CASE WHEN target='PROCESSING' THEN j.processing_at ELSE processing_at END,
   completed_at=CASE WHEN target='COMPLETED' THEN j.completed_at ELSE completed_at END,
   updated_at=now()
 WHERE id=j.request_id;
 INSERT INTO public.service_job_status_history(job_id,from_status,to_status,actor_role,actor_user_id) VALUES(j.id,old_status,target,'PROVIDER',p_provider_user_id);
 INSERT INTO public.request_status_history(request_id,from_status,to_status,actor_type,note) VALUES(j.request_id,old_status,target,'PROVIDER','Normalized service job transition');
 RETURN j;
END; $$;

REVOKE ALL ON FUNCTION public.accept_service_job(text,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_service_job(text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_service_job(text,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_service_job(text,uuid,text) TO service_role;

COMMIT;
