-- ============================================================
-- iFixIt
-- Migration 0001: Core Domain Schema
-- PostgreSQL
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- UPDATED_AT HELPER
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- ============================================================
-- 1. ATOLLS
-- ============================================================

CREATE TABLE atolls (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(32) NOT NULL,
    official_name       VARCHAR(120) NOT NULL,
    display_name        VARCHAR(120) NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    is_serviceable      BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order          INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT atolls_code_not_blank
        CHECK (btrim(code) <> ''),
    CONSTRAINT atolls_official_name_not_blank
        CHECK (btrim(official_name) <> ''),
    CONSTRAINT atolls_display_name_not_blank
        CHECK (btrim(display_name) <> ''),
    CONSTRAINT atolls_sort_order_nonnegative
        CHECK (sort_order >= 0),
    CONSTRAINT uq_atolls_code UNIQUE (code)
);

CREATE UNIQUE INDEX uq_atolls_official_name_ci
    ON atolls (lower(official_name));

CREATE INDEX idx_atolls_marketplace
    ON atolls (is_active, is_serviceable);

CREATE TRIGGER trg_atolls_updated_at
BEFORE UPDATE ON atolls
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 2. ISLANDS
-- ============================================================

CREATE TABLE islands (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atoll_id            UUID NOT NULL
                        REFERENCES atolls(id)
                        ON UPDATE RESTRICT
                        ON DELETE RESTRICT,
    canonical_name      VARCHAR(120) NOT NULL,
    display_name        VARCHAR(120) NOT NULL,
    reference_code      VARCHAR(50),
    latitude            NUMERIC(9,6),
    longitude           NUMERIC(9,6),
    is_inhabited        BOOLEAN NOT NULL DEFAULT TRUE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    is_serviceable      BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order          INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT islands_canonical_name_not_blank
        CHECK (btrim(canonical_name) <> ''),
    CONSTRAINT islands_display_name_not_blank
        CHECK (btrim(display_name) <> ''),
    CONSTRAINT islands_latitude_valid
        CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    CONSTRAINT islands_longitude_valid
        CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
    CONSTRAINT islands_sort_order_nonnegative
        CHECK (sort_order >= 0),
    CONSTRAINT uq_islands_id_atoll
        UNIQUE (id, atoll_id)
);

CREATE UNIQUE INDEX uq_islands_name_per_atoll_ci
    ON islands (atoll_id, lower(canonical_name));

CREATE UNIQUE INDEX uq_islands_reference_code_ci
    ON islands (lower(reference_code))
    WHERE reference_code IS NOT NULL;

CREATE INDEX idx_islands_atoll
    ON islands (atoll_id);

CREATE INDEX idx_islands_marketplace
    ON islands (atoll_id, is_active, is_serviceable);

CREATE TRIGGER trg_islands_updated_at
BEFORE UPDATE ON islands
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 3. USERS
-- ============================================================
-- Roles and permissions are intentionally normalized in a later
-- migration. A single authoritative primary_role is not stored here.
-- ============================================================

CREATE TABLE users (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_e164              VARCHAR(20) NOT NULL,
    phone_verified_at       TIMESTAMPTZ,
    email                   VARCHAR(254),
    email_verified_at       TIMESTAMPTZ,
    full_name               VARCHAR(150),
    account_status          VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    default_island_id       UUID
                            REFERENCES islands(id)
                            ON UPDATE RESTRICT
                            ON DELETE SET NULL,
    last_login_at           TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT users_phone_e164_format
        CHECK (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
    CONSTRAINT users_account_status_valid
        CHECK (account_status IN (
            'ACTIVE',
            'INACTIVE',
            'SUSPENDED',
            'BLOCKED',
            'DEACTIVATED'
        ))
);

CREATE UNIQUE INDEX uq_users_phone
    ON users (phone_e164);

CREATE UNIQUE INDEX uq_users_email_ci
    ON users (lower(email))
    WHERE email IS NOT NULL;

CREATE INDEX idx_users_account_status
    ON users (account_status);

CREATE INDEX idx_users_default_island
    ON users (default_island_id);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 4. PROVIDER PROFILES
-- ============================================================
-- Registered/legal location and operational base are distinct.
-- Additional approved service islands belong in provider_service_areas.
-- ============================================================

CREATE TABLE provider_profiles (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     UUID NOT NULL
                                REFERENCES users(id)
                                ON UPDATE RESTRICT
                                ON DELETE RESTRICT,
    provider_type               VARCHAR(20) NOT NULL,
    public_name                 VARCHAR(150) NOT NULL,
    business_name               VARCHAR(180),
    description                 TEXT,
    experience_years            SMALLINT NOT NULL DEFAULT 0,
    profile_photo_url           TEXT,
    preferred_contact_method    VARCHAR(20) NOT NULL DEFAULT 'PHONE',

    registered_atoll_id         UUID,
    registered_island_id        UUID,
    operational_base_atoll_id   UUID,
    operational_base_island_id  UUID,

    approval_status             VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    verification_status         VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED',
    marketplace_status          VARCHAR(30) NOT NULL DEFAULT 'INACTIVE',
    availability_status         VARCHAR(30) NOT NULL DEFAULT 'UNAVAILABLE',
    accepting_leads             BOOLEAN NOT NULL DEFAULT FALSE,
    is_suspended                BOOLEAN NOT NULL DEFAULT FALSE,
    suspended_at                TIMESTAMPTZ,
    suspension_reason           TEXT,
    approved_at                 TIMESTAMPTZ,
    approved_by                 UUID
                                REFERENCES users(id)
                                ON UPDATE RESTRICT
                                ON DELETE SET NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_provider_profiles_user
        UNIQUE (user_id),
    CONSTRAINT provider_type_valid
        CHECK (provider_type IN ('INDIVIDUAL', 'BUSINESS')),
    CONSTRAINT provider_public_name_not_blank
        CHECK (btrim(public_name) <> ''),
    CONSTRAINT provider_business_name_required
        CHECK (
            provider_type <> 'BUSINESS'
            OR (business_name IS NOT NULL AND btrim(business_name) <> '')
        ),
    CONSTRAINT provider_experience_valid
        CHECK (experience_years BETWEEN 0 AND 80),
    CONSTRAINT provider_contact_method_valid
        CHECK (preferred_contact_method IN ('PHONE', 'WHATSAPP', 'IN_APP')),
    CONSTRAINT provider_approval_status_valid
        CHECK (approval_status IN (
            'DRAFT',
            'PENDING_VERIFICATION',
            'PENDING_APPROVAL',
            'APPROVED',
            'REJECTED',
            'SUSPENDED'
        )),
    CONSTRAINT provider_verification_status_valid
        CHECK (verification_status IN (
            'UNVERIFIED',
            'PENDING',
            'PARTIALLY_VERIFIED',
            'VERIFIED',
            'REJECTED',
            'EXPIRED'
        )),
    CONSTRAINT provider_marketplace_status_valid
        CHECK (marketplace_status IN (
            'INACTIVE',
            'ACTIVE',
            'HIDDEN',
            'SUSPENDED'
        )),
    CONSTRAINT provider_availability_status_valid
        CHECK (availability_status IN (
            'AVAILABLE_NOW',
            'AVAILABLE_TODAY',
            'BY_APPOINTMENT',
            'UNAVAILABLE'
        )),
    CONSTRAINT provider_suspension_consistency
        CHECK (
            (is_suspended = FALSE AND suspended_at IS NULL)
            OR
            (is_suspended = TRUE AND suspended_at IS NOT NULL)
        ),
    CONSTRAINT provider_registered_location_pair
        CHECK (
            (registered_island_id IS NULL AND registered_atoll_id IS NULL)
            OR
            (registered_island_id IS NOT NULL AND registered_atoll_id IS NOT NULL)
        ),
    CONSTRAINT provider_operational_location_pair
        CHECK (
            (operational_base_island_id IS NULL AND operational_base_atoll_id IS NULL)
            OR
            (operational_base_island_id IS NOT NULL AND operational_base_atoll_id IS NOT NULL)
        ),
    CONSTRAINT fk_provider_registered_location
        FOREIGN KEY (registered_island_id, registered_atoll_id)
        REFERENCES islands (id, atoll_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_provider_operational_location
        FOREIGN KEY (operational_base_island_id, operational_base_atoll_id)
        REFERENCES islands (id, atoll_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
);

CREATE INDEX idx_provider_profiles_user
    ON provider_profiles (user_id);

CREATE INDEX idx_provider_operational_island
    ON provider_profiles (operational_base_island_id);

CREATE INDEX idx_provider_marketplace_eligibility
    ON provider_profiles (
        approval_status,
        verification_status,
        marketplace_status,
        is_suspended,
        accepting_leads
    );

CREATE INDEX idx_provider_local_availability
    ON provider_profiles (
        operational_base_island_id,
        availability_status
    )
    WHERE marketplace_status = 'ACTIVE'
      AND is_suspended = FALSE
      AND accepting_leads = TRUE;

CREATE TRIGGER trg_provider_profiles_updated_at
BEFORE UPDATE ON provider_profiles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 5. REPAIR REQUESTS
-- ============================================================
-- Supports Direct Booking + Smart Matching and Fixed Price +
-- Diagnosis Required. Cross-atoll matching requires explicit consent.
-- service_id becomes an FK in the catalogue migration.
-- ============================================================

CREATE TABLE repair_requests (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number               VARCHAR(40) NOT NULL,
    customer_id                 UUID NOT NULL
                                REFERENCES users(id)
                                ON UPDATE RESTRICT
                                ON DELETE RESTRICT,
    booking_model               VARCHAR(30) NOT NULL,
    requested_provider_id       UUID
                                REFERENCES provider_profiles(id)
                                ON UPDATE RESTRICT
                                ON DELETE SET NULL,
    workflow_type               VARCHAR(30) NOT NULL,
    service_id                  UUID NOT NULL,

    service_atoll_id            UUID NOT NULL,
    service_island_id           UUID NOT NULL,
    service_address             TEXT,
    building_name               VARCHAR(180),
    floor_unit                  VARCHAR(100),
    landmark                    VARCHAR(180),
    latitude                    NUMERIC(9,6),
    longitude                   NUMERIC(9,6),

    problem_description         TEXT NOT NULL,
    equipment_type              VARCHAR(120),
    brand                       VARCHAR(120),
    model                       VARCHAR(120),
    serial_number               VARCHAR(120),

    urgency                     VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    preferred_date              DATE,
    preferred_time_from         TIME,
    preferred_time_to           TIME,

    matching_scope              VARCHAR(40) NOT NULL DEFAULT 'LOCAL_ONLY',
    cross_atoll_consent_at      TIMESTAMPTZ,
    cross_atoll_consent_source  VARCHAR(30),

    status                      VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
    known_price_amount          NUMERIC(12,2),
    currency_code               CHAR(3) NOT NULL DEFAULT 'MVR',

    submitted_at                TIMESTAMPTZ,
    cancelled_at                TIMESTAMPTZ,
    cancellation_reason         TEXT,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_repair_requests_ticket
        UNIQUE (ticket_number),
    CONSTRAINT repair_booking_model_valid
        CHECK (booking_model IN ('DIRECT_PROVIDER', 'SMART_MATCHING')),
    CONSTRAINT repair_direct_provider_rule
        CHECK (
            (booking_model = 'DIRECT_PROVIDER' AND requested_provider_id IS NOT NULL)
            OR
            (booking_model = 'SMART_MATCHING' AND requested_provider_id IS NULL)
        ),
    CONSTRAINT repair_workflow_type_valid
        CHECK (workflow_type IN ('FIXED_PRICE', 'DIAGNOSIS_REQUIRED')),
    CONSTRAINT repair_description_length
        CHECK (char_length(btrim(problem_description)) BETWEEN 10 AND 5000),
    CONSTRAINT repair_urgency_valid
        CHECK (urgency IN ('NOW', 'TODAY', 'TOMORROW', 'SCHEDULED')),
    CONSTRAINT repair_matching_scope_valid
        CHECK (matching_scope IN (
            'LOCAL_ONLY',
            'TARGET_ISLAND_SERVICE_AREA_ALLOWED',
            'SAME_ATOLL_ALLOWED',
            'CROSS_ATOLL_ALLOWED'
        )),
    CONSTRAINT repair_cross_atoll_consent_required
        CHECK (
            matching_scope <> 'CROSS_ATOLL_ALLOWED'
            OR cross_atoll_consent_at IS NOT NULL
        ),
    CONSTRAINT repair_cross_atoll_source_valid
        CHECK (
            cross_atoll_consent_source IS NULL
            OR cross_atoll_consent_source IN ('CUSTOMER', 'ADMIN', 'POLICY')
        ),
    CONSTRAINT repair_cross_atoll_consent_pair
        CHECK (
            (cross_atoll_consent_at IS NULL AND cross_atoll_consent_source IS NULL)
            OR
            (cross_atoll_consent_at IS NOT NULL AND cross_atoll_consent_source IS NOT NULL)
        ),
    CONSTRAINT repair_known_price_valid
        CHECK (known_price_amount IS NULL OR known_price_amount >= 0),
    CONSTRAINT repair_currency_valid
        CHECK (currency_code ~ '^[A-Z]{3}$'),
    CONSTRAINT repair_coordinates_valid
        CHECK (
            (latitude IS NULL AND longitude IS NULL)
            OR
            (
                latitude IS NOT NULL
                AND longitude IS NOT NULL
                AND latitude BETWEEN -90 AND 90
                AND longitude BETWEEN -180 AND 180
            )
        ),
    CONSTRAINT repair_time_window_valid
        CHECK (
            preferred_time_from IS NULL
            OR preferred_time_to IS NULL
            OR preferred_time_to > preferred_time_from
        ),
    CONSTRAINT repair_status_valid
        CHECK (status IN (
            'DRAFT',
            'SUBMITTED',
            'AWAITING_ASSIGNMENT',
            'PROVIDER_OFFERED',
            'PROVIDER_ASSIGNED',
            'ACCEPTED',
            'SCHEDULED',
            'IN_PROGRESS',
            'COMPLETED',
            'CANCELLED',
            'EXPIRED'
        )),
    CONSTRAINT fk_repair_request_location
        FOREIGN KEY (service_island_id, service_atoll_id)
        REFERENCES islands (id, atoll_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
);

CREATE INDEX idx_repair_requests_customer
    ON repair_requests (customer_id, created_at DESC);

CREATE INDEX idx_repair_requests_direct_provider
    ON repair_requests (requested_provider_id, status)
    WHERE requested_provider_id IS NOT NULL;

CREATE INDEX idx_repair_requests_matching_queue
    ON repair_requests (
        service_island_id,
        service_id,
        matching_scope,
        status,
        created_at
    )
    WHERE status IN ('SUBMITTED', 'AWAITING_ASSIGNMENT', 'PROVIDER_OFFERED');

CREATE INDEX idx_repair_requests_customer_active
    ON repair_requests (customer_id, status)
    WHERE status NOT IN ('COMPLETED', 'CANCELLED', 'EXPIRED');

CREATE INDEX idx_repair_requests_schedule
    ON repair_requests (preferred_date, preferred_time_from)
    WHERE preferred_date IS NOT NULL;

CREATE TRIGGER trg_repair_requests_updated_at
BEFORE UPDATE ON repair_requests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 6. IMMUTABLE CANONICAL MASTER IDS
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_primary_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.id <> OLD.id THEN
        RAISE EXCEPTION 'Primary identifier cannot be changed';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_atolls_immutable_id
BEFORE UPDATE ON atolls
FOR EACH ROW
EXECUTE FUNCTION prevent_primary_id_change();

CREATE TRIGGER trg_islands_immutable_id
BEFORE UPDATE ON islands
FOR EACH ROW
EXECUTE FUNCTION prevent_primary_id_change();

COMMIT;
