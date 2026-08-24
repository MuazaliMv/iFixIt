-- Remove obsolete scheduling requirement from customer request submission.
-- Safe migration: only relaxes known schedule/date columns if they exist.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='repair_requests' AND column_name='preferred_date'
  ) THEN
    EXECUTE 'ALTER TABLE public.repair_requests ALTER COLUMN preferred_date DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='repair_requests' AND column_name='scheduled_date'
  ) THEN
    EXECUTE 'ALTER TABLE public.repair_requests ALTER COLUMN scheduled_date DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='service_requests' AND column_name='preferred_date'
  ) THEN
    EXECUTE 'ALTER TABLE public.service_requests ALTER COLUMN preferred_date DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='service_requests' AND column_name='scheduled_date'
  ) THEN
    EXECUTE 'ALTER TABLE public.service_requests ALTER COLUMN scheduled_date DROP NOT NULL';
  END IF;
END $$;

-- Remove obsolete SCHEDULE choice from configurable request-form options while
-- preserving any other configured values. This update is intentionally narrow.
UPDATE public.request_form_fields
SET options = (
  SELECT COALESCE(jsonb_agg(value), '[]'::jsonb)
  FROM jsonb_array_elements(options::jsonb) AS value
  WHERE upper(trim(both '"' from value::text)) <> 'SCHEDULE'
)
WHERE field_key='urgency'
  AND options IS NOT NULL;
