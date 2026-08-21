-- ============================================================
-- iFixIt
-- Migration 0008: Security Baseline
-- ============================================================

BEGIN;

ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.prevent_primary_id_change() SET search_path = public, pg_temp;

ALTER TABLE atolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE islands ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON
  atolls,
  islands,
  users,
  provider_profiles,
  repair_requests,
  roles,
  permissions,
  role_permissions,
  user_roles,
  otp_challenges,
  auth_attempts,
  auth_sessions,
  security_events
FROM anon, authenticated;

COMMIT;
