-- ============================================================
-- iFixIt
-- Migration 0007: Centralized MVP Request Intake
-- ============================================================

BEGIN;

CREATE TABLE request_intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(40) NOT NULL UNIQUE,
  client_request_id VARCHAR(120),
  service_name VARCHAR(120) NOT NULL,
  service_location_text VARCHAR(220) NOT NULL,
  preferred_date DATE NOT NULL,
  problem_description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'NEW',
  source VARCHAR(30) NOT NULL DEFAULT 'WEB_MVP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT request_intake_service_not_blank
    CHECK (btrim(service_name) <> ''),
  CONSTRAINT request_intake_location_not_blank
    CHECK (btrim(service_location_text) <> ''),
  CONSTRAINT request_intake_description_length
    CHECK (char_length(btrim(problem_description)) BETWEEN 10 AND 5000),
  CONSTRAINT request_intake_status_valid
    CHECK (status IN ('NEW', 'ACCEPTED', 'PROCESSING', 'COMPLETED'))
);

CREATE UNIQUE INDEX uq_request_intake_client_request_id
  ON request_intake(client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE INDEX idx_request_intake_status_created
  ON request_intake(status, created_at DESC);

CREATE TRIGGER trg_request_intake_updated_at
BEFORE UPDATE ON request_intake
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE request_intake ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON request_intake FROM anon, authenticated;

COMMIT;
