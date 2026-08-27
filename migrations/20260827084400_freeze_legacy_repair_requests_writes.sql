-- Canonical request architecture freeze
-- request_intake -> service_jobs is the only application request lifecycle.
-- repair_requests is retained temporarily for audit/rollback analysis only.
-- No destructive DROP is performed by this migration.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.repair_requests FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.repair_requests FROM authenticated;

COMMENT ON TABLE public.repair_requests IS
  'LEGACY / READ-ONLY FOR APPLICATION ROLES. Canonical request lifecycle is public.request_intake -> public.service_jobs. Do not add new application dependencies.';

COMMENT ON TABLE public.request_intake IS
  'CANONICAL customer request record for iFixMV MVP.';

COMMENT ON TABLE public.service_jobs IS
  'CANONICAL provider job lifecycle linked to public.request_intake.';
