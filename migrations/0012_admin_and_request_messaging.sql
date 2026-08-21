-- ============================================================
-- iFixIt
-- Migration 0012: Admin Operations & Request Messaging
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS request_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES request_intake(id) ON DELETE CASCADE,
  sender_role VARCHAR(20) NOT NULL,
  sender_label VARCHAR(120),
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT request_messages_sender_role_valid CHECK (sender_role IN ('CUSTOMER','PROVIDER','ADMIN')),
  CONSTRAINT request_messages_text_length CHECK (char_length(btrim(message_text)) BETWEEN 1 AND 2000)
);

CREATE INDEX IF NOT EXISTS idx_request_messages_request_time
  ON request_messages(request_id, created_at ASC);

ALTER TABLE request_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON request_messages FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS admin_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label VARCHAR(120) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_access_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON admin_access_tokens FROM anon, authenticated;

-- The production MVP admin token hash is seeded out-of-band.
-- Full Supabase Auth + RBAC will replace temporary access tokens.

COMMIT;
