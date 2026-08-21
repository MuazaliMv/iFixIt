CREATE INDEX idx_service_job_history_actor_user
ON public.service_job_status_history(actor_user_id)
WHERE actor_user_id IS NOT NULL;
