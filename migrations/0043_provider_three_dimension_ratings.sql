ALTER TABLE public.request_reviews
  ADD COLUMN IF NOT EXISTS quality_rating smallint,
  ADD COLUMN IF NOT EXISTS time_rating smallint,
  ADD COLUMN IF NOT EXISTS cost_rating smallint,
  ADD COLUMN IF NOT EXISTS overall_rating numeric(4,3);

DO $$ BEGIN
  ALTER TABLE public.request_reviews ADD CONSTRAINT request_reviews_quality_rating_check CHECK (quality_rating IS NULL OR quality_rating BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.request_reviews ADD CONSTRAINT request_reviews_time_rating_check CHECK (time_rating IS NULL OR time_rating BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.request_reviews ADD CONSTRAINT request_reviews_cost_rating_check CHECK (cost_rating IS NULL OR cost_rating BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.request_reviews ADD CONSTRAINT request_reviews_overall_rating_check CHECK (overall_rating IS NULL OR overall_rating BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE public.request_reviews
SET quality_rating = COALESCE(quality_rating, rating),
    time_rating = COALESCE(time_rating, rating),
    cost_rating = COALESCE(cost_rating, rating),
    overall_rating = COALESCE(overall_rating, rating::numeric)
WHERE rating IS NOT NULL;

CREATE OR REPLACE FUNCTION public.submit_request_rating(
  p_request_id uuid,
  p_customer_user_id uuid,
  p_quality_rating integer,
  p_time_rating integer,
  p_cost_rating integer,
  p_review_text text DEFAULT NULL
)
RETURNS public.request_reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r public.request_intake%ROWTYPE;
  saved public.request_reviews%ROWTYPE;
  calculated numeric(4,3);
BEGIN
  IF p_quality_rating NOT BETWEEN 1 AND 5
     OR p_time_rating NOT BETWEEN 1 AND 5
     OR p_cost_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Each rating must be between 1 and 5';
  END IF;

  SELECT * INTO r
  FROM public.request_intake
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF r.customer_auth_user_id IS DISTINCT FROM p_customer_user_id THEN
    RAISE EXCEPTION 'Request does not belong to customer';
  END IF;
  IF r.status <> 'COMPLETED' OR r.completed_at IS NULL THEN
    RAISE EXCEPTION 'Only completed work can be rated';
  END IF;
  IF r.assigned_provider_user_id IS NULL THEN
    RAISE EXCEPTION 'Completed request has no provider';
  END IF;
  IF now() >= r.completed_at + interval '48 hours' THEN
    RAISE EXCEPTION 'Rating period has expired';
  END IF;
  IF EXISTS (SELECT 1 FROM public.request_reviews WHERE request_id = r.id) THEN
    RAISE EXCEPTION 'Rating already submitted';
  END IF;

  calculated := round((p_quality_rating + p_time_rating + p_cost_rating)::numeric / 3, 3);

  INSERT INTO public.request_reviews(
    request_id, customer_user_id, provider_user_id,
    rating, quality_rating, time_rating, cost_rating, overall_rating,
    review_text
  ) VALUES (
    r.id, p_customer_user_id, r.assigned_provider_user_id,
    round(calculated)::smallint, p_quality_rating, p_time_rating, p_cost_rating, calculated,
    NULLIF(left(btrim(COALESCE(p_review_text, '')), 2000), '')
  )
  RETURNING * INTO saved;

  RETURN saved;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_request_rating(uuid,uuid,integer,integer,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_request_rating(uuid,uuid,integer,integer,integer,text) TO service_role;

CREATE OR REPLACE VIEW public.provider_rating_summary
WITH (security_invoker = true)
AS
WITH stats AS (
  SELECT provider_user_id,
         count(*)::integer AS review_count,
         avg(overall_rating)::numeric(5,3) AS average_rating,
         avg(quality_rating)::numeric(5,3) AS average_quality_rating,
         avg(time_rating)::numeric(5,3) AS average_time_rating,
         avg(cost_rating)::numeric(5,3) AS average_cost_rating
  FROM public.request_reviews
  WHERE overall_rating IS NOT NULL
  GROUP BY provider_user_id
), market AS (
  SELECT COALESCE(avg(overall_rating), 0)::numeric AS marketplace_average
  FROM public.request_reviews
  WHERE overall_rating IS NOT NULL
), scored AS (
  SELECT s.*,
         round(((s.review_count::numeric / (s.review_count + 5)) * s.average_rating
              + (5::numeric / (s.review_count + 5)) * m.marketplace_average), 4) AS ranking_score
  FROM stats s CROSS JOIN market m
)
SELECT scored.*,
       rank() OVER (ORDER BY ranking_score DESC) AS provider_rank
FROM scored;

REVOKE ALL ON public.provider_rating_summary FROM anon, authenticated;
