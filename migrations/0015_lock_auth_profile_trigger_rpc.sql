-- ============================================================
-- iFixIt
-- Migration 0015: Lock Auth Profile Trigger From RPC Execution
-- ============================================================

BEGIN;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM anon, authenticated;

COMMIT;
