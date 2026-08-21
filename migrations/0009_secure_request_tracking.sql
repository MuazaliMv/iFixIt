BEGIN;

ALTER TABLE request_intake
  ADD COLUMN IF NOT EXISTS customer_tracking_hash TEXT,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_request_intake_tracking_hash
  ON request_intake(customer_tracking_hash)
  WHERE customer_tracking_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS request_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES request_intake(id) ON DELETE CASCADE,
  from_status VARCHAR(20),
  to_status VARCHAR(20) NOT NULL,
  actor_type VARCHAR(20) NOT NULL DEFAULT 'SYSTEM',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT request_status_history_to_valid CHECK (to_status IN ('NEW','ACCEPTED','PROCESSING','COMPLETED')),
  CONSTRAINT request_status_history_from_valid CHECK (from_status IS NULL OR from_status IN ('NEW','ACCEPTED','PROCESSING','COMPLETED')),
  CONSTRAINT request_status_history_actor_valid CHECK (actor_type IN ('SYSTEM','CUSTOMER','PROVIDER','ADMIN'))
);

CREATE INDEX IF NOT EXISTS idx_request_status_history_request_time
  ON request_status_history(request_id, created_at);

ALTER TABLE request_status_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON request_status_history FROM anon, authenticated;

CREATE OR REPLACE FUNCTION record_request_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'ACCEPTED' AND NEW.accepted_at IS NULL THEN NEW.accepted_at = now(); END IF;
    IF NEW.status = 'PROCESSING' AND NEW.processing_at IS NULL THEN NEW.processing_at = now(); END IF;
    IF NEW.status = 'COMPLETED' AND NEW.completed_at IS NULL THEN NEW.completed_at = now(); END IF;
    INSERT INTO request_status_history(request_id, from_status, to_status, actor_type)
    VALUES (NEW.id, OLD.status, NEW.status, 'SYSTEM');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_request_status_history ON request_intake;
CREATE TRIGGER trg_request_status_history
BEFORE UPDATE OF status ON request_intake
FOR EACH ROW EXECUTE FUNCTION record_request_status_change();

COMMIT;
