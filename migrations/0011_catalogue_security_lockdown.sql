BEGIN;

ALTER TABLE island_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_services ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON island_aliases FROM anon, authenticated;
REVOKE ALL ON service_categories FROM anon, authenticated;
REVOKE ALL ON service_subcategories FROM anon, authenticated;
REVOKE ALL ON repair_services FROM anon, authenticated;

ALTER FUNCTION enforce_repair_request_service_workflow() SET search_path = public;

COMMIT;
