BEGIN;
CREATE INDEX IF NOT EXISTS idx_request_estimates_inspection ON public.request_estimates(inspection_id) WHERE inspection_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_request_reviews_customer ON public.request_reviews(customer_user_id,created_at DESC);
COMMIT;
