-- ============================================================
-- iFixIt
-- Migration 0016: Auth-native Provider Onboarding
-- ============================================================
-- Reconciles the original 0004 provider onboarding design with the
-- live Supabase Auth identity layer. Payment/pricing is intentionally
-- excluded from this MVP migration.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS provider_onboarding_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL DEFAULT 'INDIVIDUAL' CHECK (provider_type IN ('INDIVIDUAL','BUSINESS')),
  public_name TEXT NOT NULL CHECK (btrim(public_name) <> ''),
  business_name TEXT,
  description TEXT,
  experience_years SMALLINT NOT NULL DEFAULT 0 CHECK (experience_years BETWEEN 0 AND 80),
  service_area_text TEXT NOT NULL CHECK (btrim(service_area_text) <> ''),
  availability_status TEXT NOT NULL DEFAULT 'BY_APPOINTMENT' CHECK (availability_status IN ('AVAILABLE_NOW','AVAILABLE_TODAY','BY_APPOINTMENT','UNAVAILABLE')),
  accepting_leads BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (onboarding_status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','SUSPENDED')),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_service_categories (
  provider_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_user_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_service_categories_category
  ON provider_service_categories(category_id, provider_user_id)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS provider_weekly_hours (
  provider_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  is_working BOOLEAN NOT NULL DEFAULT TRUE,
  start_time TIME,
  end_time TIME,
  timezone_name TEXT NOT NULL DEFAULT 'Indian/Maldives',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_user_id, day_of_week),
  CHECK ((is_working = FALSE AND start_time IS NULL AND end_time IS NULL)
      OR (is_working = TRUE AND start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time))
);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_provider_onboarding_profiles_updated_at ON provider_onboarding_profiles;
CREATE TRIGGER trg_provider_onboarding_profiles_updated_at
BEFORE UPDATE ON provider_onboarding_profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_provider_weekly_hours_updated_at ON provider_weekly_hours;
CREATE TRIGGER trg_provider_weekly_hours_updated_at
BEFORE UPDATE ON provider_weekly_hours
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE provider_onboarding_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_weekly_hours ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON provider_onboarding_profiles, provider_service_categories, provider_weekly_hours FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated;

COMMIT;
