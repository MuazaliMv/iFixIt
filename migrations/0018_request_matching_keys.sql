-- ============================================================
-- iFixIt
-- Migration 0018: Provider request matching keys
-- ============================================================

BEGIN;

ALTER TABLE public.request_intake
    ADD COLUMN IF NOT EXISTS service_category_code text;

ALTER TABLE public.request_intake
    ADD COLUMN IF NOT EXISTS assigned_provider_user_id uuid
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

UPDATE public.request_intake
SET service_category_code = CASE lower(btrim(service_name))
    WHEN 'ac repair' THEN 'AC_SERVICES'
    WHEN 'plumbing' THEN 'PLUMBING'
    WHEN 'electrical' THEN 'ELECTRICAL'
    WHEN 'appliance repair' THEN 'APPLIANCE_REPAIR'
    WHEN 'cleaning' THEN 'CLEANING'
    WHEN 'handyman' THEN 'GENERAL_HANDYMAN'
    ELSE service_category_code
END
WHERE service_category_code IS NULL;

CREATE INDEX IF NOT EXISTS idx_request_intake_matching
    ON public.request_intake(service_category_code, status, created_at DESC)
    WHERE assigned_provider_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_request_intake_assigned_provider_user
    ON public.request_intake(assigned_provider_user_id, status, updated_at DESC);

COMMIT;
