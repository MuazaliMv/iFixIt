-- ============================================================
-- iFixIt
-- Migration 0004: Provider Onboarding, Services, Service Areas & Availability
-- PostgreSQL
--
-- Depends on:
--   0001_core_domain.sql
--   0002_auth_rbac.sql
--   0003_location_catalogue.sql
--
-- Adds:
--   provider_services
--   provider_service_pricing
--   provider_service_areas
--   provider_weekly_availability
--   provider_availability_overrides
--   provider_verification_documents
--   provider_status_history
--
-- Architectural rules:
--   * provider legal registration location remains separate from operational base
--   * provider_profiles.operational_base_island_id is Tier 0 matching location
--   * additional service islands are explicit normalized records
--   * exact service capability is required for matching
--   * availability never bypasses approval/verification/suspension/subscription
--   * disabled historical records are preserved
-- ============================================================

BEGIN;

-- ============================================================
-- 1. PROVIDER EXACT SERVICES
-- ============================================================
-- A provider is eligible for an exact service only when a current ACTIVE
-- provider_services row exists and all other marketplace checks also pass.
-- ============================================================

CREATE TABLE provider_services (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    provider_id             UUID NOT NULL
                            REFERENCES provider_profiles(id)
                            ON UPDATE RESTRICT
                            ON DELETE RESTRICT,

    service_id              UUID NOT NULL
                            REFERENCES repair_services(id)
                            ON UPDATE RESTRICT
                            ON DELETE RESTRICT,

    status                  VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',

    years_experience        SMALLINT,

    provider_note           TEXT,

    approved_at             TIMESTAMPTZ,
    approved_by             UUID
                            REFERENCES users(id)
                            ON UPDATE RESTRICT
                            ON DELETE SET NULL,

    deactivated_at          TIMESTAMPTZ,
    deactivation_reason     TEXT,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_provider_services
        UNIQUE (provider_id, service_id),

    CONSTRAINT provider_services_status_valid
        CHECK (
            status IN (
                'ACTIVE',
                'INACTIVE',
                'PENDING_VERIFICATION',
                'REJECTED'
            )
        ),

    CONSTRAINT provider_services_experience_valid
        CHECK (
            years_experience IS NULL
            OR years_experience BETWEEN 0 AND 80
        ),

    CONSTRAINT provider_services_deactivation_consistency
        CHECK (
            (status = 'ACTIVE' AND deactivated_at IS NULL)
            OR status <> 'ACTIVE'
        )
);

CREATE INDEX idx_provider_services_provider
    ON provider_services (provider_id, status);

CREATE INDEX idx_provider_services_matching
    ON provider_services (service_id, provider_id)
    WHERE status = 'ACTIVE';

CREATE TRIGGER trg_provider_services_updated_at
BEFORE UPDATE ON provider_services
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 2. PROVIDER SERVICE PRICING
-- ============================================================
-- Pricing presentation is provider-service specific.
-- Historical price rows remain available through effective dates.
-- ============================================================

CREATE TABLE provider_service_pricing (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    provider_service_id     UUID NOT NULL
                            REFERENCES provider_services(id)
                            ON UPDATE RESTRICT
                            ON DELETE RESTRICT,

    pricing_model           VARCHAR(30) NOT NULL,

    base_amount             NUMERIC(12,2),
    currency_code           CHAR(3) NOT NULL DEFAULT 'MVR',

    unit_label              VARCHAR(60),

    travel_fee              NUMERIC(12,2),
    overtime_rate           NUMERIC(12,2),
    weekend_rate            NUMERIC(12,2),
    holiday_rate            NUMERIC(12,2),

    estimated_duration_min  INTEGER,

    effective_from          TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to            TIMESTAMPTZ,

    is_active               BOOLEAN NOT NULL DEFAULT TRUE,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT provider_service_pricing_model_valid
        CHECK (
            pricing_model IN (
                'FIXED',
                'STARTING_FROM',
                'HOURLY',
                'INSPECTION_REQUIRED',
                'QUOTE_REQUIRED'
            )
        ),

    CONSTRAINT provider_service_pricing_base_required
        CHECK (
            pricing_model NOT IN ('FIXED', 'STARTING_FROM', 'HOURLY')
            OR base_amount IS NOT NULL
        ),

    CONSTRAINT provider_service_pricing_amounts_nonnegative
        CHECK (
            (base_amount IS NULL OR base_amount >= 0)
            AND (travel_fee IS NULL OR travel_fee >= 0)
            AND (overtime_rate IS NULL OR overtime_rate >= 0)
            AND (weekend_rate IS NULL OR weekend_rate >= 0)
            AND (holiday_rate IS NULL OR holiday_rate >= 0)
        ),

    CONSTRAINT provider_service_pricing_currency_valid
        CHECK (currency_code ~ '^[A-Z]{3}$'),

    CONSTRAINT provider_service_pricing_duration_valid
        CHECK (
            estimated_duration_min IS NULL
            OR estimated_duration_min > 0
        ),

    CONSTRAINT provider_service_pricing_effective_range_valid
        CHECK (
            effective_to IS NULL
            OR effective_to > effective_from
        )
);

CREATE UNIQUE INDEX uq_provider_service_pricing_one_current
    ON provider_service_pricing (provider_service_id)
    WHERE is_active = TRUE AND effective_to IS NULL;

CREATE INDEX idx_provider_service_pricing_history
    ON provider_service_pricing (
        provider_service_id,
        effective_from DESC
    );

CREATE TRIGGER trg_provider_service_pricing_updated_at
BEFORE UPDATE ON provider_service_pricing
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 3. PROVIDER SERVICE AREAS
-- ============================================================
-- Tier 0 is NOT stored here; Tier 0 is the provider's operational base island.
-- This table represents explicitly approved additional service islands.
--
-- Geographic tiers:
--   Tier 0 = provider_profiles.operational_base_island_id
--   Tier 1 = explicit active TARGET_ISLAND service area
--   Tier 2 = same-atoll expansion only when request/policy allows it
--   Tier 3 = cross-atoll only with explicit request/policy/admin consent
-- ============================================================

CREATE TABLE provider_service_areas (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    provider_id             UUID NOT NULL
                            REFERENCES provider_profiles(id)
                            ON UPDATE RESTRICT
                            ON DELETE RESTRICT,

    atoll_id                UUID NOT NULL,
    island_id               UUID NOT NULL,

    service_scope           VARCHAR(30) NOT NULL DEFAULT 'TARGET_ISLAND',

    minimum_notice_hours    INTEGER,
    travel_note             TEXT,

    is_active               BOOLEAN NOT NULL DEFAULT TRUE,

    approved_at             TIMESTAMPTZ,
    approved_by             UUID
                            REFERENCES users(id)
                            ON UPDATE RESTRICT
                            ON DELETE SET NULL,

    deactivated_at          TIMESTAMPTZ,
    deactivation_reason     TEXT,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_provider_service_area_location
        FOREIGN KEY (island_id, atoll_id)
        REFERENCES islands (id, atoll_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    CONSTRAINT uq_provider_service_area
        UNIQUE (provider_id, island_id),

    CONSTRAINT provider_service_area_scope_valid
        CHECK (
            service_scope IN (
                'TARGET_ISLAND'
            )
        ),

    CONSTRAINT provider_service_area_notice_valid
        CHECK (
            minimum_notice_hours IS NULL
            OR minimum_notice_hours >= 0
        ),

    CONSTRAINT provider_service_area_deactivation_consistency
        CHECK (
            (is_active = TRUE AND deactivated_at IS NULL)
            OR is_active = FALSE
        )
);

CREATE INDEX idx_provider_service_areas_provider
    ON provider_service_areas (provider_id, is_active);

CREATE INDEX idx_provider_service_areas_matching
    ON provider_service_areas (island_id, provider_id)
    WHERE is_active = TRUE;

CREATE INDEX idx_provider_service_areas_atoll
    ON provider_service_areas (atoll_id, provider_id)
    WHERE is_active = TRUE;

CREATE TRIGGER trg_provider_service_areas_updated_at
BEFORE UPDATE ON provider_service_areas
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 4. WEEKLY AVAILABILITY
-- ============================================================
-- ISO weekday convention:
--   1 = Monday ... 7 = Sunday
-- Maldives timezone is stored explicitly for clarity.
-- ============================================================

CREATE TABLE provider_weekly_availability (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    provider_id         UUID NOT NULL
                        REFERENCES provider_profiles(id)
                        ON UPDATE RESTRICT
                        ON DELETE CASCADE,

    day_of_week         SMALLINT NOT NULL,

    is_working          BOOLEAN NOT NULL DEFAULT TRUE,

    start_time          TIME,
    end_time            TIME,

    timezone_name       VARCHAR(80) NOT NULL DEFAULT 'Indian/Maldives',

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT provider_weekly_day_valid
        CHECK (day_of_week BETWEEN 1 AND 7),

    CONSTRAINT provider_weekly_hours_consistent
        CHECK (
            (is_working = FALSE AND start_time IS NULL AND end_time IS NULL)
            OR
            (is_working = TRUE
             AND start_time IS NOT NULL
             AND end_time IS NOT NULL
             AND end_time > start_time)
        ),

    CONSTRAINT uq_provider_weekly_availability
        UNIQUE (provider_id, day_of_week)
);

CREATE INDEX idx_provider_weekly_availability_provider
    ON provider_weekly_availability (provider_id, day_of_week);

CREATE TRIGGER trg_provider_weekly_availability_updated_at
BEFORE UPDATE ON provider_weekly_availability
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 5. AVAILABILITY OVERRIDES
-- ============================================================
-- Date-specific overrides take precedence over recurring weekly hours.
-- Examples: holiday, temporary closure, special working window.
-- ============================================================

CREATE TABLE provider_availability_overrides (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    provider_id             UUID NOT NULL
                            REFERENCES provider_profiles(id)
                            ON UPDATE RESTRICT
                            ON DELETE CASCADE,

    override_date           DATE NOT NULL,

    availability_status     VARCHAR(30) NOT NULL,

    start_time              TIME,
    end_time                TIME,

    reason                  VARCHAR(250),

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT provider_availability_override_status_valid
        CHECK (
            availability_status IN (
                'AVAILABLE_NOW',
                'AVAILABLE_TODAY',
                'BY_APPOINTMENT',
                'UNAVAILABLE'
            )
        ),

    CONSTRAINT provider_availability_override_hours_valid
        CHECK (
            (start_time IS NULL AND end_time IS NULL)
            OR
            (start_time IS NOT NULL
             AND end_time IS NOT NULL
             AND end_time > start_time)
        ),

    CONSTRAINT uq_provider_availability_override
        UNIQUE (provider_id, override_date)
);

CREATE INDEX idx_provider_availability_overrides_lookup
    ON provider_availability_overrides (provider_id, override_date);

CREATE TRIGGER trg_provider_availability_overrides_updated_at
BEFORE UPDATE ON provider_availability_overrides
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 6. PROVIDER VERIFICATION DOCUMENT METADATA
-- ============================================================
-- Actual files belong in private object storage. This table stores only
-- controlled metadata and a private storage key/reference.
-- ============================================================

CREATE TABLE provider_verification_documents (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    provider_id             UUID NOT NULL
                            REFERENCES provider_profiles(id)
                            ON UPDATE RESTRICT
                            ON DELETE RESTRICT,

    document_type           VARCHAR(40) NOT NULL,

    storage_key             TEXT NOT NULL,
    original_filename       VARCHAR(255),
    mime_type               VARCHAR(120),

    document_number_masked  VARCHAR(120),

    issue_date              DATE,
    expiry_date             DATE,

    status                  VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',

    reviewed_at             TIMESTAMPTZ,
    reviewed_by             UUID
                            REFERENCES users(id)
                            ON UPDATE RESTRICT
                            ON DELETE SET NULL,

    rejection_reason        TEXT,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT provider_verification_document_type_valid
        CHECK (
            document_type IN (
                'IDENTITY_DOCUMENT',
                'BUSINESS_REGISTRATION',
                'TRADE_LICENCE',
                'QUALIFICATION_CERTIFICATE',
                'TAX_GST_DOCUMENT',
                'POLICE_CLEARANCE',
                'INSURANCE_CERTIFICATE',
                'OTHER'
            )
        ),

    CONSTRAINT provider_verification_storage_key_not_blank
        CHECK (btrim(storage_key) <> ''),

    CONSTRAINT provider_verification_document_status_valid
        CHECK (
            status IN (
                'SUBMITTED',
                'UNDER_REVIEW',
                'VERIFIED',
                'REJECTED',
                'EXPIRED',
                'SUPERSEDED'
            )
        ),

    CONSTRAINT provider_verification_expiry_valid
        CHECK (
            expiry_date IS NULL
            OR issue_date IS NULL
            OR expiry_date >= issue_date
        ),

    CONSTRAINT provider_verification_rejection_reason
        CHECK (
            status <> 'REJECTED'
            OR (rejection_reason IS NOT NULL AND btrim(rejection_reason) <> '')
        )
);

CREATE INDEX idx_provider_verification_documents_provider
    ON provider_verification_documents (provider_id, status);

CREATE INDEX idx_provider_verification_documents_expiry
    ON provider_verification_documents (expiry_date)
    WHERE status = 'VERIFIED' AND expiry_date IS NOT NULL;

CREATE TRIGGER trg_provider_verification_documents_updated_at
BEFORE UPDATE ON provider_verification_documents
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 7. PROVIDER STATUS HISTORY
-- ============================================================
-- Records onboarding/approval/verification/marketplace/suspension changes.
-- It does not replace the current state columns in provider_profiles.
-- ============================================================

CREATE TABLE provider_status_history (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    provider_id         UUID NOT NULL
                        REFERENCES provider_profiles(id)
                        ON UPDATE RESTRICT
                        ON DELETE RESTRICT,

    status_domain       VARCHAR(30) NOT NULL,

    from_status         VARCHAR(40),
    to_status           VARCHAR(40) NOT NULL,

    reason              TEXT,

    changed_by          UUID
                        REFERENCES users(id)
                        ON UPDATE RESTRICT
                        ON DELETE SET NULL,

    source              VARCHAR(30) NOT NULL DEFAULT 'USER_ACTION',

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT provider_status_history_domain_valid
        CHECK (
            status_domain IN (
                'APPROVAL',
                'VERIFICATION',
                'MARKETPLACE',
                'SUSPENSION',
                'AVAILABILITY'
            )
        ),

    CONSTRAINT provider_status_history_to_not_blank
        CHECK (btrim(to_status) <> ''),

    CONSTRAINT provider_status_history_source_valid
        CHECK (
            source IN (
                'USER_ACTION',
                'ADMIN_ACTION',
                'SYSTEM_AUTOMATION'
            )
        )
);

CREATE INDEX idx_provider_status_history_provider
    ON provider_status_history (provider_id, created_at DESC);

CREATE INDEX idx_provider_status_history_domain
    ON provider_status_history (provider_id, status_domain, created_at DESC);


-- ============================================================
-- 8. PROVIDER PROFILE ONBOARDING TIMESTAMPS
-- ============================================================

ALTER TABLE provider_profiles
    ADD COLUMN application_submitted_at TIMESTAMPTZ,
    ADD COLUMN last_reviewed_at TIMESTAMPTZ;


-- ============================================================
-- 9. ACTIVE SERVICE MUST REFERENCE ACTIVE CATALOGUE SERVICE
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_provider_service_catalogue_state()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_service_active BOOLEAN;
BEGIN
    SELECT is_active
      INTO v_service_active
      FROM repair_services
     WHERE id = NEW.service_id;

    IF v_service_active IS NULL THEN
        RAISE EXCEPTION 'Unknown repair service: %', NEW.service_id;
    END IF;

    IF NEW.status = 'ACTIVE' AND v_service_active = FALSE THEN
        RAISE EXCEPTION 'Provider cannot activate a disabled repair service';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_provider_service_catalogue_state
BEFORE INSERT OR UPDATE OF service_id, status
ON provider_services
FOR EACH ROW
EXECUTE FUNCTION enforce_provider_service_catalogue_state();


-- ============================================================
-- 10. SERVICE AREA MUST NOT DUPLICATE OPERATIONAL BASE
-- ============================================================
-- The operational base already represents Tier 0. Duplicating it as a Tier 1
-- service-area row would make matching-stage reporting ambiguous.
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_operational_base_service_area_duplicate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_operational_island UUID;
BEGIN
    SELECT operational_base_island_id
      INTO v_operational_island
      FROM provider_profiles
     WHERE id = NEW.provider_id;

    IF v_operational_island IS NOT NULL
       AND NEW.island_id = v_operational_island THEN
        RAISE EXCEPTION
            'Operational base island is Tier 0 and must not be duplicated in provider_service_areas';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_provider_service_area_not_base
BEFORE INSERT OR UPDATE OF provider_id, island_id
ON provider_service_areas
FOR EACH ROW
EXECUTE FUNCTION prevent_operational_base_service_area_duplicate();


-- ============================================================
-- 11. PROVIDER MATCHING-READINESS VIEW
-- ============================================================
-- Subscription eligibility is intentionally NOT included yet because the
-- subscription schema is introduced in a later migration.
-- The final matching engine must add qualifying subscription state when
-- required by the active marketplace policy.
-- ============================================================

CREATE VIEW provider_matching_readiness AS
SELECT
    pp.id AS provider_id,
    pp.user_id,
    pp.operational_base_atoll_id,
    pp.operational_base_island_id,
    pp.availability_status,
    pp.accepting_leads,
    pp.approval_status,
    pp.verification_status,
    pp.marketplace_status,
    pp.is_suspended,
    (
        pp.approval_status = 'APPROVED'
        AND pp.verification_status = 'VERIFIED'
        AND pp.marketplace_status = 'ACTIVE'
        AND pp.is_suspended = FALSE
        AND pp.accepting_leads = TRUE
        AND pp.operational_base_island_id IS NOT NULL
    ) AS base_ready_without_subscription
FROM provider_profiles pp;


-- ============================================================
-- 12. MATCHING / ONBOARDING RULE NOTES
-- ============================================================
-- A provider must not be selected merely because a row exists here.
-- Final matching eligibility requires server-side evaluation of:
--
--   1. provider account active
--   2. provider approval valid
--   3. required verification valid
--   4. provider not suspended
--   5. qualifying subscription when required (later migration)
--   6. exact provider_services match ACTIVE
--   7. canonical geography eligibility
--   8. requested-time availability
--   9. accepting_leads = TRUE
--
-- Geography:
--   Tier 0: operational_base_island_id == request.service_island_id
--   Tier 1: active provider_service_areas island == request.service_island_id
--   Tier 2: same-atoll expansion only when matching scope/policy permits
--   Tier 3: cross-atoll only when explicit consent/policy permits
--
-- No free-text island comparison is permitted.
-- ============================================================

COMMIT;
