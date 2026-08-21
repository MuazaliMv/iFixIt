BEGIN;

ALTER TABLE request_intake
  ADD COLUMN IF NOT EXISTS assigned_provider_label VARCHAR(150);

CREATE TABLE IF NOT EXISTS provider_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label VARCHAR(150) NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

ALTER TABLE provider_access_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON provider_access_tokens FROM anon, authenticated;

-- Only a SHA-256 hash is committed. The actual temporary MVP provider token is not stored in source control.
INSERT INTO provider_access_tokens(label, token_hash)
VALUES ('FixIt MVP Provider', '484b7c7f603e67b5b8798415c40d4dc50b3ed4072c5268381ac1903beb15bb14')
ON CONFLICT (token_hash) DO NOTHING;

COMMIT;
