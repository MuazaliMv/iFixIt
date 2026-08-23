-- Prevent regression where request_inspections.preferred_slots (jsonb)
-- is accidentally treated as a PostgreSQL array.
-- This migration is intentionally defensive and should be kept in source control.

DO $$
DECLARE
  v_type text;
BEGIN
  SELECT data_type
    INTO v_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'request_inspections'
    AND column_name = 'preferred_slots';

  IF v_type IS DISTINCT FROM 'jsonb' THEN
    RAISE EXCEPTION 'Schema mismatch: request_inspections.preferred_slots must be jsonb, found %', coalesce(v_type, 'missing');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_request_inspection_preferred_slots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  slot text;
  normalized jsonb := '[]'::jsonb;
  unique_count integer := 0;
  local_now timestamp without time zone := timezone('Indian/Maldives', now());
  parsed_local timestamp without time zone;
  parsed_tz timestamptz;
BEGIN
  -- Legacy invalid slots must not block unrelated workflow transitions.
  IF tg_op = 'UPDATE'
     AND new.preferred_slots IS NOT DISTINCT FROM old.preferred_slots
     AND new.status <> 'PROPOSED' THEN
    RETURN new;
  END IF;

  IF new.preferred_slots IS NULL THEN
    new.preferred_slots := '[]'::jsonb;
  END IF;

  IF jsonb_typeof(new.preferred_slots) <> 'array' THEN
    RAISE EXCEPTION 'Preferred times must be a JSON array';
  END IF;

  IF jsonb_array_length(new.preferred_slots) > 3 THEN
    RAISE EXCEPTION 'Choose no more than three preferred times';
  END IF;

  SELECT coalesce(jsonb_agg(v), '[]'::jsonb)
    INTO normalized
  FROM (
    SELECT btrim(value) AS v
    FROM jsonb_array_elements_text(new.preferred_slots)
    WHERE btrim(value) <> ''
  ) s;

  new.preferred_slots := normalized;

  SELECT count(distinct value)
    INTO unique_count
  FROM jsonb_array_elements_text(new.preferred_slots);

  IF unique_count <> jsonb_array_length(new.preferred_slots) THEN
    RAISE EXCEPTION 'Preferred times must be unique';
  END IF;

  IF new.status = 'PROPOSED' AND jsonb_array_length(new.preferred_slots) = 0 THEN
    RAISE EXCEPTION 'Add at least one preferred time';
  END IF;

  FOR slot IN SELECT value FROM jsonb_array_elements_text(new.preferred_slots)
  LOOP
    BEGIN
      IF slot ~ '(Z|[+-][0-9]{2}:[0-9]{2})$' THEN
        parsed_tz := slot::timestamptz;
        IF parsed_tz <= now() THEN
          RAISE EXCEPTION 'Preferred times must be in the future';
        END IF;
      ELSE
        parsed_local := slot::timestamp without time zone;
        IF parsed_local <= local_now THEN
          RAISE EXCEPTION 'Preferred times must be in the future';
        END IF;
      END IF;
    EXCEPTION
      WHEN invalid_datetime_format OR datetime_field_overflow THEN
        RAISE EXCEPTION 'Preferred times must be valid date/time values';
    END;
  END LOOP;

  RETURN new;
END;
$$;

-- Database-level shape guard, independent of the trigger implementation.
ALTER TABLE public.request_inspections
  DROP CONSTRAINT IF EXISTS request_inspections_preferred_slots_json_array_chk;

ALTER TABLE public.request_inspections
  ADD CONSTRAINT request_inspections_preferred_slots_json_array_chk
  CHECK (
    preferred_slots IS NULL
    OR (
      jsonb_typeof(preferred_slots) = 'array'
      AND jsonb_array_length(preferred_slots) <= 3
    )
  ) NOT VALID;

COMMENT ON FUNCTION public.validate_request_inspection_preferred_slots()
IS 'JSONB-native validator. Do not replace jsonb_* functions with PostgreSQL array_* functions; preferred_slots is jsonb.';
