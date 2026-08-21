BEGIN;

-- Existing authentication/profile fields are included defensively so this
-- migration is safe on databases that already received the auth upgrade.
ALTER TABLE public.auth_profiles
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state_region TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS provider_address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS provider_address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS provider_city TEXT,
  ADD COLUMN IF NOT EXISTS provider_state_region TEXT,
  ADD COLUMN IF NOT EXISTS provider_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS provider_country TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_auth_profiles_phone_number
  ON public.auth_profiles(phone_number)
  WHERE phone_number IS NOT NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS city VARCHAR(120),
  ADD COLUMN IF NOT EXISTS state_region VARCHAR(120),
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(40),
  ADD COLUMN IF NOT EXISTS country VARCHAR(120);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_phone_number
  ON public.users(phone_number)
  WHERE phone_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.user_service_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT,
  state_region TEXT,
  postal_code TEXT,
  country TEXT,
  service_atoll_id UUID REFERENCES public.atolls(id) ON DELETE SET NULL,
  service_island_id UUID REFERENCES public.islands(id) ON DELETE SET NULL,
  service_location_unit_id UUID REFERENCES public.location_units(id) ON DELETE SET NULL,
  access_instructions TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_service_addresses_label_not_blank CHECK (btrim(label) <> ''),
  CONSTRAINT user_service_addresses_line1_not_blank CHECK (btrim(address_line1) <> ''),
  CONSTRAINT user_service_addresses_label_length CHECK (char_length(label) <= 80),
  CONSTRAINT user_service_addresses_address_length CHECK (char_length(address_line1) <= 255),
  CONSTRAINT user_service_addresses_instructions_length CHECK (access_instructions IS NULL OR char_length(access_instructions) <= 1000)
);

CREATE INDEX IF NOT EXISTS idx_user_service_addresses_user_active
  ON public.user_service_addresses(user_id, is_active, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_service_addresses_default
  ON public.user_service_addresses(user_id)
  WHERE is_default = TRUE AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_service_addresses_atoll
  ON public.user_service_addresses(service_atoll_id)
  WHERE service_atoll_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_service_addresses_island
  ON public.user_service_addresses(service_island_id)
  WHERE service_island_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_service_addresses_unit
  ON public.user_service_addresses(service_location_unit_id)
  WHERE service_location_unit_id IS NOT NULL;

ALTER TABLE public.auth_profiles
  ADD COLUMN IF NOT EXISTS default_service_address_id UUID REFERENCES public.user_service_addresses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_auth_profiles_default_service_address_id
  ON public.auth_profiles(default_service_address_id)
  WHERE default_service_address_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.touch_user_service_address_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_user_service_addresses_updated_at ON public.user_service_addresses;
CREATE TRIGGER trg_user_service_addresses_updated_at
BEFORE UPDATE ON public.user_service_addresses
FOR EACH ROW EXECUTE FUNCTION public.touch_user_service_address_updated_at();

ALTER TABLE public.user_service_addresses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_service_addresses FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_service_addresses TO service_role;

-- Request lifecycle remains backwards-compatible while supporting customer cancellation.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='request_intake_status_valid') THEN
    ALTER TABLE public.request_intake DROP CONSTRAINT request_intake_status_valid;
  END IF;
END $$;
ALTER TABLE public.request_intake
  ADD CONSTRAINT request_intake_status_valid CHECK (status IN ('PENDING','RESPONDED','ACCEPTED','INSPECTION_SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED'));

COMMIT;
