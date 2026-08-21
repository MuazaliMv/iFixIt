BEGIN;

CREATE TABLE IF NOT EXISTS auth_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER','PROVIDER','ADMIN')),
  provider_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE requested_role TEXT;
BEGIN
  requested_role := upper(coalesce(NEW.raw_user_meta_data->>'role','CUSTOMER'));
  IF requested_role NOT IN ('CUSTOMER','PROVIDER') THEN requested_role := 'CUSTOMER'; END IF;
  INSERT INTO public.auth_profiles (user_id,email,full_name,role,provider_approved)
  VALUES (NEW.id,NEW.email,nullif(btrim(coalesce(NEW.raw_user_meta_data->>'full_name','')), ''),requested_role,FALSE)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_fixit ON auth.users;
CREATE TRIGGER on_auth_user_created_fixit AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.touch_auth_profile_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_auth_profiles_updated_at ON auth_profiles;
CREATE TRIGGER trg_auth_profiles_updated_at BEFORE UPDATE ON auth_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_auth_profile_updated_at();

ALTER TABLE auth_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON auth_profiles FROM anon;
GRANT SELECT ON auth_profiles TO authenticated;
DROP POLICY IF EXISTS auth_profiles_read_self ON auth_profiles;
CREATE POLICY auth_profiles_read_self ON auth_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());

ALTER TABLE request_intake ADD COLUMN IF NOT EXISTS customer_auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_request_intake_customer_auth_user_id ON request_intake(customer_auth_user_id, created_at DESC);

COMMIT;