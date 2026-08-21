CREATE INDEX IF NOT EXISTS idx_auth_attempts_challenge_id
  ON public.auth_attempts(challenge_id)
  WHERE challenge_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_request_intake_cancelled_by_user_id
  ON public.request_intake(cancelled_by_user_id)
  WHERE cancelled_by_user_id IS NOT NULL;
