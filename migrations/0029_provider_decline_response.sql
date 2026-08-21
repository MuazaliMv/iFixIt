BEGIN;
ALTER TABLE public.request_provider_responses DROP CONSTRAINT IF EXISTS request_provider_responses_status_check;
ALTER TABLE public.request_provider_responses ADD CONSTRAINT request_provider_responses_status_check CHECK (status IN ('INTERESTED','SELECTED','NOT_SELECTED','WITHDRAWN','DECLINED'));
COMMIT;
