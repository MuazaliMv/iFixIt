-- ============================================================
-- iFixIt
-- Migration 0006: Repair Jobs & Lifecycle
-- PostgreSQL
--
-- Depends on:
--   0001_core_domain.sql
--   0002_auth_rbac.sql
--   0003_location_catalogue.sql
--   0004_provider_onboarding_service_areas_availability.sql
--   0005_search_tier_matching_engine.sql
--
-- Adds:
--   repair_jobs
--   repair_job_status_history
--   repair_job_schedule_history
--   repair_job_progress_events
--   job lifecycle transition enforcement
--   coarse repair_request status synchronization
--   helper to create a job from an accepted active assignment
--
-- Design:
--   * repair_request = customer demand
--   * repair_assignment = provider assignment history
--   * repair_job = accepted operational work
--   * one logical repair job per repair request
--   * reassignment history remains in repair_assignments
--   * inspection/quotation/completion evidence is extended in 0007
-- ============================================================

BEGIN;

-- ============================================================
-- 1. REPAIR JOBS
-- ============================================================

CREATE TABLE repair_jobs (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    job_number                  VARCHAR(40) NOT NULL,

    repair_request_id           UUID NOT NULL
                                REFERENCES repair_requests(id)
                                ON UPDATE RESTRICT
                                ON DELETE RESTRICT,

    current_assignment_id       UUID NOT NULL
                                REFERENCES repair_assignments(id)
                                ON UPDATE RESTRICT
                                ON DELETE RESTRICT,

    provider_id                 UUID NOT NULL
                                REFERENCES provider_profiles(id)
                                ON UPDATE RESTRICT
                                ON DELETE RESTRICT,

    customer_id                 UUID NOT NULL
                                REFERENCES users(id)
                                ON UPDATE RESTRICT
                                ON DELETE RESTRICT,

    service_id                  UUID NOT NULL
                                REFERENCES repair_services(id)
                                ON UPDATE RESTRICT
                                ON DELETE RESTRICT,

    workflow_type               VARCHAR(30) NOT NULL,

    status                      VARCHAR(40) NOT NULL DEFAULT 'ACCEPTED',

    scheduled_start_at          TIMESTAMPTZ,
    scheduled_end_at            TIMESTAMPTZ,
    actual_started_at           TIMESTAMPTZ,
    repair_completed_at         TIMESTAMPTZ,
    customer_confirmed_at       TIMESTAMPTZ,
    finalized_at                TIMESTAMPTZ,
    cancelled_at                TIMESTAMPTZ,

    provider_completion_note    TEXT,
    internal_note               TEXT,

    final_recorded_amount       NUMERIC(12,2),
    currency_code               CHAR(3) NOT NULL DEFAULT 'MVR',

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_repair_jobs_job_number
        UNIQUE (job_number),

    CONSTRAINT uq_repair_jobs_request
        UNIQUE (repair_request_id),

    CONSTRAINT repair_job_workflow_valid
        CHECK (workflow_type IN ('FIXED_PRICE', 'DIAGNOSIS_REQUIRED')),

    CONSTRAINT repair_job_status_valid
        CHECK (status IN (
            'ACCEPTED',
            'SCHEDULED',
            'INSPECTION_SCHEDULED',
            'INSPECTED',
            'QUOTE_PENDING',
            'QUOTE_APPROVED',
            'REPAIR_SCHEDULED',
            'IN_PROGRESS',
            'WAITING_FOR_PARTS',
            'ON_HOLD',
            'REPAIR_COMPLETED',
            'CUSTOMER_CONFIRMATION',
            'DISPUTED',
            'FINALIZED',
            'CANCELLED',
            'UNABLE_TO_REPAIR'
        )),

    CONSTRAINT repair_job_schedule_range_valid
        CHECK (
            scheduled_end_at IS NULL
            OR scheduled_start_at IS NULL
            OR scheduled_end_at > scheduled_start_at
        ),

    CONSTRAINT repair_job_start_time_valid
        CHECK (
            actual_started_at IS NULL
            OR actual_started_at >= created_at
        ),

    CONSTRAINT repair_job_completion_time_valid
        CHECK (
            repair_completed_at IS NULL
            OR actual_started_at IS NULL
            OR repair_completed_at >= actual_started_at
        ),

    CONSTRAINT repair_job_customer_confirmation_time_valid
        CHECK (
            customer_confirmed_at IS NULL
            OR repair_completed_at IS NULL
            OR customer_confirmed_at >= repair_completed_at
        ),

    CONSTRAINT repair_job_finalized_time_valid
        CHECK (
            finalized_at IS NULL
            OR finalized_at >= created_at
        ),

    CONSTRAINT repair_job_cancelled_time_valid
        CHECK (
            cancelled_at IS NULL
            OR cancelled_at >= created_at
        ),

    CONSTRAINT repair_job_amount_valid
        CHECK (
            final_recorded_amount IS NULL
            OR final_recorded_amount >= 0
        ),

    CONSTRAINT repair_job_currency_valid
        CHECK (currency_code ~ '^[A-Z]{3}$'),

    CONSTRAINT repair_job_terminal_timestamp_consistency
        CHECK (
            (status <> 'FINALIZED' OR finalized_at IS NOT NULL)
            AND (status <> 'CANCELLED' OR cancelled_at IS NOT NULL)
        )
);

CREATE INDEX idx_repair_jobs_provider_status
    ON repair_jobs (provider_id, status, updated_at DESC);

CREATE INDEX idx_repair_jobs_customer_status
    ON repair_jobs (customer_id, status, updated_at DESC);

CREATE INDEX idx_repair_jobs_schedule
    ON repair_jobs (scheduled_start_at, provider_id)
    WHERE status IN (
        'SCHEDULED',
        'INSPECTION_SCHEDULED',
        'REPAIR_SCHEDULED'
    );

CREATE INDEX idx_repair_jobs_active_provider
    ON repair_jobs (provider_id, updated_at DESC)
    WHERE status NOT IN ('FINALIZED', 'CANCELLED', 'UNABLE_TO_REPAIR');

CREATE TRIGGER trg_repair_jobs_updated_at
BEFORE UPDATE ON repair_jobs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 2. JOB STATUS HISTORY
-- ============================================================

CREATE TABLE repair_job_status_history (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    job_id                  UUID NOT NULL
                            REFERENCES repair_jobs(id)
                            ON UPDATE RESTRICT
                            ON DELETE RESTRICT,

    from_status             VARCHAR(40),
    to_status               VARCHAR(40) NOT NULL,

    changed_by              UUID
                            REFERENCES users(id)
                            ON UPDATE RESTRICT
                            ON DELETE SET NULL,

    change_source           VARCHAR(30) NOT NULL DEFAULT 'USER_ACTION',
    reason                  TEXT,
    metadata                JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT repair_job_history_source_valid
        CHECK (change_source IN (
            'USER_ACTION',
            'PROVIDER_ACTION',
            'CUSTOMER_ACTION',
            'ADMIN_ACTION',
            'SYSTEM_AUTOMATION'
        )),

    CONSTRAINT repair_job_history_to_not_blank
        CHECK (btrim(to_status) <> '')
);

CREATE INDEX idx_repair_job_status_history_job
    ON repair_job_status_history (job_id, created_at DESC);


-- ============================================================
-- 3. SCHEDULE HISTORY
-- ============================================================
-- Schedule changes are append-oriented; repair_jobs keeps only the current
-- scheduled window for efficient operational reads.
-- ============================================================

CREATE TABLE repair_job_schedule_history (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    job_id                  UUID NOT NULL
                            REFERENCES repair_jobs(id)
                            ON UPDATE RESTRICT
                            ON DELETE RESTRICT,

    schedule_type           VARCHAR(30) NOT NULL,

    scheduled_start_at      TIMESTAMPTZ NOT NULL,
    scheduled_end_at        TIMESTAMPTZ,

    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    created_by              UUID
                            REFERENCES users(id)
                            ON UPDATE RESTRICT
                            ON DELETE SET NULL,

    change_reason           TEXT,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT repair_job_schedule_type_valid
        CHECK (schedule_type IN ('SERVICE', 'INSPECTION', 'REPAIR', 'FOLLOW_UP')),

    CONSTRAINT repair_job_schedule_status_valid
        CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'CANCELLED', 'COMPLETED')),

    CONSTRAINT repair_job_schedule_history_range_valid
        CHECK (
            scheduled_end_at IS NULL
            OR scheduled_end_at > scheduled_start_at
        )
);

CREATE INDEX idx_repair_job_schedule_history_job
    ON repair_job_schedule_history (job_id, created_at DESC);

CREATE UNIQUE INDEX uq_repair_job_schedule_one_active_type
    ON repair_job_schedule_history (job_id, schedule_type)
    WHERE status = 'ACTIVE';


-- ============================================================
-- 4. PROGRESS EVENTS
-- ============================================================

CREATE TABLE repair_job_progress_events (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    job_id                  UUID NOT NULL
                            REFERENCES repair_jobs(id)
                            ON UPDATE RESTRICT
                            ON DELETE RESTRICT,

    event_type              VARCHAR(40) NOT NULL,
    message                 TEXT,

    customer_visible        BOOLEAN NOT NULL DEFAULT TRUE,

    created_by              UUID
                            REFERENCES users(id)
                            ON UPDATE RESTRICT
                            ON DELETE SET NULL,

    metadata                JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT repair_job_progress_type_valid
        CHECK (event_type IN (
            'JOB_CREATED',
            'SCHEDULED',
            'RESCHEDULED',
            'INSPECTION_STARTED',
            'INSPECTION_COMPLETED',
            'DIAGNOSIS_RECORDED',
            'QUOTE_SUBMITTED',
            'QUOTE_APPROVED',
            'QUOTE_REJECTED',
            'REPAIR_STARTED',
            'WAITING_FOR_PARTS',
            'REPAIR_RESUMED',
            'ON_HOLD',
            'PROGRESS_UPDATE',
            'REPAIR_COMPLETED',
            'CUSTOMER_CONFIRMED',
            'DISPUTED',
            'FINALIZED',
            'CANCELLED',
            'UNABLE_TO_REPAIR'
        ))
);

CREATE INDEX idx_repair_job_progress_job
    ON repair_job_progress_events (job_id, created_at DESC);

CREATE INDEX idx_repair_job_progress_customer
    ON repair_job_progress_events (job_id, created_at DESC)
    WHERE customer_visible = TRUE;


-- ============================================================
-- 5. JOB / ASSIGNMENT CONSISTENCY
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_repair_job_assignment_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_assignment repair_assignments%ROWTYPE;
    v_request repair_requests%ROWTYPE;
BEGIN
    SELECT *
      INTO v_assignment
      FROM repair_assignments
     WHERE id = NEW.current_assignment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Repair assignment not found';
    END IF;

    IF v_assignment.repair_request_id <> NEW.repair_request_id THEN
        RAISE EXCEPTION 'Job assignment does not belong to repair request';
    END IF;

    IF v_assignment.provider_id <> NEW.provider_id THEN
        RAISE EXCEPTION 'Job provider does not match current assignment provider';
    END IF;

    IF v_assignment.status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'Job current assignment must be ACTIVE';
    END IF;

    SELECT *
      INTO v_request
      FROM repair_requests
     WHERE id = NEW.repair_request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Repair request not found';
    END IF;

    IF v_request.customer_id <> NEW.customer_id THEN
        RAISE EXCEPTION 'Job customer does not match repair request customer';
    END IF;

    IF v_request.service_id <> NEW.service_id THEN
        RAISE EXCEPTION 'Job service does not match repair request service';
    END IF;

    IF v_request.workflow_type <> NEW.workflow_type THEN
        RAISE EXCEPTION 'Job workflow does not match repair request workflow';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_repair_job_assignment_consistency
BEFORE INSERT OR UPDATE OF current_assignment_id, repair_request_id, provider_id, customer_id, service_id, workflow_type
ON repair_jobs
FOR EACH ROW
EXECUTE FUNCTION enforce_repair_job_assignment_consistency();


-- ============================================================
-- 6. ALLOWED JOB STATE TRANSITIONS
-- ============================================================

CREATE OR REPLACE FUNCTION repair_job_transition_allowed(
    p_from VARCHAR,
    p_to VARCHAR
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN p_from = p_to THEN TRUE

        WHEN p_from = 'ACCEPTED'
          AND p_to IN (
              'SCHEDULED',
              'INSPECTION_SCHEDULED',
              'REPAIR_SCHEDULED',
              'IN_PROGRESS',
              'CANCELLED',
              'UNABLE_TO_REPAIR'
          ) THEN TRUE

        WHEN p_from = 'SCHEDULED'
          AND p_to IN (
              'INSPECTION_SCHEDULED',
              'REPAIR_SCHEDULED',
              'IN_PROGRESS',
              'CANCELLED',
              'UNABLE_TO_REPAIR'
          ) THEN TRUE

        WHEN p_from = 'INSPECTION_SCHEDULED'
          AND p_to IN ('INSPECTED', 'CANCELLED', 'UNABLE_TO_REPAIR') THEN TRUE

        WHEN p_from = 'INSPECTED'
          AND p_to IN ('QUOTE_PENDING', 'QUOTE_APPROVED', 'REPAIR_SCHEDULED', 'CANCELLED', 'UNABLE_TO_REPAIR') THEN TRUE

        WHEN p_from = 'QUOTE_PENDING'
          AND p_to IN ('QUOTE_APPROVED', 'CANCELLED', 'UNABLE_TO_REPAIR') THEN TRUE

        WHEN p_from = 'QUOTE_APPROVED'
          AND p_to IN ('REPAIR_SCHEDULED', 'IN_PROGRESS', 'CANCELLED', 'UNABLE_TO_REPAIR') THEN TRUE

        WHEN p_from = 'REPAIR_SCHEDULED'
          AND p_to IN ('IN_PROGRESS', 'CANCELLED', 'UNABLE_TO_REPAIR') THEN TRUE

        WHEN p_from = 'IN_PROGRESS'
          AND p_to IN ('WAITING_FOR_PARTS', 'ON_HOLD', 'REPAIR_COMPLETED', 'DISPUTED', 'UNABLE_TO_REPAIR') THEN TRUE

        WHEN p_from = 'WAITING_FOR_PARTS'
          AND p_to IN ('IN_PROGRESS', 'ON_HOLD', 'CANCELLED', 'UNABLE_TO_REPAIR') THEN TRUE

        WHEN p_from = 'ON_HOLD'
          AND p_to IN ('IN_PROGRESS', 'WAITING_FOR_PARTS', 'CANCELLED', 'UNABLE_TO_REPAIR') THEN TRUE

        WHEN p_from = 'REPAIR_COMPLETED'
          AND p_to IN ('CUSTOMER_CONFIRMATION', 'DISPUTED', 'FINALIZED') THEN TRUE

        WHEN p_from = 'CUSTOMER_CONFIRMATION'
          AND p_to IN ('FINALIZED', 'DISPUTED') THEN TRUE

        WHEN p_from = 'DISPUTED'
          AND p_to IN ('IN_PROGRESS', 'REPAIR_COMPLETED', 'CUSTOMER_CONFIRMATION', 'FINALIZED', 'CANCELLED') THEN TRUE

        ELSE FALSE
    END;
$$;


CREATE OR REPLACE FUNCTION enforce_repair_job_state_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT repair_job_transition_allowed(OLD.status, NEW.status) THEN
        RAISE EXCEPTION 'Invalid repair job transition: % -> %', OLD.status, NEW.status;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_repair_job_state_transition
BEFORE UPDATE OF status ON repair_jobs
FOR EACH ROW
EXECUTE FUNCTION enforce_repair_job_state_transition();


-- ============================================================
-- 7. AUTOMATIC STATUS HISTORY
-- ============================================================
-- Actor is intentionally nullable at DB-trigger level. Application/API writes
-- should use explicit service functions/audit context when actor attribution is
-- available. The DB still guarantees that state changes leave history.
-- ============================================================

CREATE OR REPLACE FUNCTION record_repair_job_status_history()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO repair_job_status_history (
            job_id,
            from_status,
            to_status,
            change_source
        ) VALUES (
            NEW.id,
            NULL,
            NEW.status,
            'SYSTEM_AUTOMATION'
        );

        RETURN NEW;
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO repair_job_status_history (
            job_id,
            from_status,
            to_status,
            change_source
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            'SYSTEM_AUTOMATION'
        );
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_repair_job_status_history_insert
AFTER INSERT ON repair_jobs
FOR EACH ROW
EXECUTE FUNCTION record_repair_job_status_history();

CREATE TRIGGER trg_repair_job_status_history_update
AFTER UPDATE OF status ON repair_jobs
FOR EACH ROW
EXECUTE FUNCTION record_repair_job_status_history();


-- ============================================================
-- 8. COARSE REPAIR REQUEST STATUS SYNCHRONIZATION
-- ============================================================
-- repair_requests remains a customer-demand/matching entity with a simpler
-- state set. Detailed operational status belongs to repair_jobs.
-- ============================================================

CREATE OR REPLACE FUNCTION sync_repair_request_status_from_job()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_request_status VARCHAR(40);
BEGIN
    v_request_status := CASE
        WHEN NEW.status = 'ACCEPTED' THEN 'ACCEPTED'
        WHEN NEW.status IN ('SCHEDULED', 'INSPECTION_SCHEDULED', 'REPAIR_SCHEDULED') THEN 'SCHEDULED'
        WHEN NEW.status IN (
            'INSPECTED',
            'QUOTE_PENDING',
            'QUOTE_APPROVED',
            'IN_PROGRESS',
            'WAITING_FOR_PARTS',
            'ON_HOLD',
            'REPAIR_COMPLETED',
            'CUSTOMER_CONFIRMATION',
            'DISPUTED',
            'UNABLE_TO_REPAIR'
        ) THEN 'IN_PROGRESS'
        WHEN NEW.status = 'FINALIZED' THEN 'COMPLETED'
        WHEN NEW.status = 'CANCELLED' THEN 'CANCELLED'
        ELSE NULL
    END;

    IF v_request_status IS NOT NULL THEN
        UPDATE repair_requests
           SET status = v_request_status,
               cancelled_at = CASE
                   WHEN v_request_status = 'CANCELLED' THEN COALESCE(cancelled_at, now())
                   ELSE cancelled_at
               END
         WHERE id = NEW.repair_request_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_repair_request_from_job_insert
AFTER INSERT ON repair_jobs
FOR EACH ROW
EXECUTE FUNCTION sync_repair_request_status_from_job();

CREATE TRIGGER trg_sync_repair_request_from_job_update
AFTER UPDATE OF status ON repair_jobs
FOR EACH ROW
EXECUTE FUNCTION sync_repair_request_status_from_job();


-- ============================================================
-- 9. CREATE JOB FROM ACCEPTED ACTIVE ASSIGNMENT
-- ============================================================

CREATE OR REPLACE FUNCTION create_repair_job_from_assignment(
    p_assignment_id UUID,
    p_job_number VARCHAR
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_assignment repair_assignments%ROWTYPE;
    v_request repair_requests%ROWTYPE;
    v_job_id UUID;
BEGIN
    IF p_job_number IS NULL OR btrim(p_job_number) = '' THEN
        RAISE EXCEPTION 'Job number is required';
    END IF;

    SELECT *
      INTO v_assignment
      FROM repair_assignments
     WHERE id = p_assignment_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Assignment not found';
    END IF;

    IF v_assignment.status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'Assignment must be ACTIVE to create a repair job';
    END IF;

    SELECT *
      INTO v_request
      FROM repair_requests
     WHERE id = v_assignment.repair_request_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Repair request not found';
    END IF;

    IF v_request.status <> 'ACCEPTED' THEN
        RAISE EXCEPTION 'Repair request must be ACCEPTED to create a repair job; current status %', v_request.status;
    END IF;

    IF EXISTS (
        SELECT 1
          FROM repair_jobs
         WHERE repair_request_id = v_request.id
    ) THEN
        SELECT id
          INTO v_job_id
          FROM repair_jobs
         WHERE repair_request_id = v_request.id;

        RETURN v_job_id;
    END IF;

    INSERT INTO repair_jobs (
        job_number,
        repair_request_id,
        current_assignment_id,
        provider_id,
        customer_id,
        service_id,
        workflow_type,
        status,
        currency_code
    ) VALUES (
        p_job_number,
        v_request.id,
        v_assignment.id,
        v_assignment.provider_id,
        v_request.customer_id,
        v_request.service_id,
        v_request.workflow_type,
        'ACCEPTED',
        v_request.currency_code
    )
    RETURNING id INTO v_job_id;

    INSERT INTO repair_job_progress_events (
        job_id,
        event_type,
        message,
        customer_visible
    ) VALUES (
        v_job_id,
        'JOB_CREATED',
        'Provider accepted and repair job was created.',
        TRUE
    );

    RETURN v_job_id;
END;
$$;


-- ============================================================
-- 10. REASSIGN CURRENT JOB PROVIDER SAFELY
-- ============================================================
-- Assignment creation/eligibility remains governed by the matching/admin
-- assignment layer. This function only attaches an already-active replacement
-- assignment to the existing logical job.
-- ============================================================

CREATE OR REPLACE FUNCTION attach_active_assignment_to_job(
    p_job_id UUID,
    p_assignment_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_job repair_jobs%ROWTYPE;
    v_assignment repair_assignments%ROWTYPE;
BEGIN
    SELECT *
      INTO v_job
      FROM repair_jobs
     WHERE id = p_job_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Repair job not found';
    END IF;

    IF v_job.status IN ('FINALIZED', 'CANCELLED') THEN
        RAISE EXCEPTION 'Terminal repair job cannot be reassigned';
    END IF;

    SELECT *
      INTO v_assignment
      FROM repair_assignments
     WHERE id = p_assignment_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Assignment not found';
    END IF;

    IF v_assignment.status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'Replacement assignment must be ACTIVE';
    END IF;

    IF v_assignment.repair_request_id <> v_job.repair_request_id THEN
        RAISE EXCEPTION 'Replacement assignment belongs to a different repair request';
    END IF;

    UPDATE repair_jobs
       SET current_assignment_id = v_assignment.id,
           provider_id = v_assignment.provider_id
     WHERE id = v_job.id;

    INSERT INTO repair_job_progress_events (
        job_id,
        event_type,
        message,
        customer_visible,
        metadata
    ) VALUES (
        v_job.id,
        'PROGRESS_UPDATE',
        'Assigned service provider was updated.',
        TRUE,
        jsonb_build_object(
            'assignmentId', v_assignment.id,
            'providerId', v_assignment.provider_id
        )
    );
END;
$$;


-- ============================================================
-- 11. TERMINAL ASSIGNMENT SYNCHRONIZATION
-- ============================================================

CREATE OR REPLACE FUNCTION sync_assignment_from_terminal_job()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'FINALIZED' AND OLD.status IS DISTINCT FROM NEW.status THEN
        UPDATE repair_assignments
           SET status = 'COMPLETED',
               ended_at = COALESCE(ended_at, now()),
               end_reason = COALESCE(end_reason, 'JOB_FINALIZED')
         WHERE id = NEW.current_assignment_id
           AND status = 'ACTIVE';
    ELSIF NEW.status = 'CANCELLED' AND OLD.status IS DISTINCT FROM NEW.status THEN
        UPDATE repair_assignments
           SET status = 'CANCELLED',
               ended_at = COALESCE(ended_at, now()),
               end_reason = COALESCE(end_reason, 'JOB_CANCELLED')
         WHERE id = NEW.current_assignment_id
           AND status = 'ACTIVE';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_assignment_from_terminal_job
AFTER UPDATE OF status ON repair_jobs
FOR EACH ROW
EXECUTE FUNCTION sync_assignment_from_terminal_job();


COMMIT;
