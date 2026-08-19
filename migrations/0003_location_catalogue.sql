-- ============================================================
-- iFixIt
-- Migration 0003: Maldives Location Master & Service Catalogue
-- PostgreSQL
--
-- Depends on:
--   0001_core_domain.sql
--   0002_auth_rbac.sql
--
-- Adds:
--   island_aliases
--   service_categories
--   service_subcategories
--   repair_services
--
-- Also binds repair_requests.service_id to repair_services(id).
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ISLAND ALIASES
-- ============================================================
-- Free-text island names are search helpers only.
-- Matching must always resolve to islands.id before business rules run.
-- ============================================================

CREATE TABLE island_aliases (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    island_id           UUID NOT NULL
                        REFERENCES islands(id)
                        ON UPDATE RESTRICT
                        ON DELETE CASCADE,

    alias               VARCHAR(160) NOT NULL,
    normalized_alias    VARCHAR(160) NOT NULL,

    alias_type          VARCHAR(30) NOT NULL DEFAULT 'ALTERNATE_NAME',
    language_code       VARCHAR(10),

    is_active           BOOLEAN NOT NULL DEFAULT TRUE,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT island_aliases_alias_not_blank
        CHECK (btrim(alias) <> ''),

    CONSTRAINT island_aliases_normalized_not_blank
        CHECK (btrim(normalized_alias) <> ''),

    CONSTRAINT island_aliases_type_valid
        CHECK (
            alias_type IN (
                'ALTERNATE_NAME',
                'COMMON_NAME',
                'FORMER_NAME',
                'LOCAL_NAME',
                'SEARCH_ALIAS'
            )
        ),

    CONSTRAINT uq_island_alias_per_island
        UNIQUE (island_id, normalized_alias)
);

CREATE INDEX idx_island_aliases_lookup
    ON island_aliases (normalized_alias)
    WHERE is_active = TRUE;

CREATE INDEX idx_island_aliases_island
    ON island_aliases (island_id);

CREATE TRIGGER trg_island_aliases_updated_at
BEFORE UPDATE ON island_aliases
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 2. SERVICE CATEGORIES
-- ============================================================

CREATE TABLE service_categories (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code                VARCHAR(60) NOT NULL,
    name                VARCHAR(120) NOT NULL,
    description         TEXT,
    icon_key            VARCHAR(80),

    sort_order          INTEGER NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured         BOOLEAN NOT NULL DEFAULT FALSE,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT service_categories_code_not_blank
        CHECK (btrim(code) <> ''),

    CONSTRAINT service_categories_name_not_blank
        CHECK (btrim(name) <> ''),

    CONSTRAINT service_categories_sort_nonnegative
        CHECK (sort_order >= 0),

    CONSTRAINT uq_service_categories_code
        UNIQUE (code)
);

CREATE UNIQUE INDEX uq_service_categories_name_ci
    ON service_categories (lower(name));

CREATE INDEX idx_service_categories_active_sort
    ON service_categories (is_active, sort_order);

CREATE TRIGGER trg_service_categories_updated_at
BEFORE UPDATE ON service_categories
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 3. SERVICE SUBCATEGORIES
-- ============================================================

CREATE TABLE service_subcategories (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    category_id         UUID NOT NULL
                        REFERENCES service_categories(id)
                        ON UPDATE RESTRICT
                        ON DELETE RESTRICT,

    code                VARCHAR(60) NOT NULL,
    name                VARCHAR(120) NOT NULL,
    description         TEXT,

    sort_order          INTEGER NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT service_subcategories_code_not_blank
        CHECK (btrim(code) <> ''),

    CONSTRAINT service_subcategories_name_not_blank
        CHECK (btrim(name) <> ''),

    CONSTRAINT service_subcategories_sort_nonnegative
        CHECK (sort_order >= 0),

    CONSTRAINT uq_service_subcategories_category_code
        UNIQUE (category_id, code)
);

CREATE UNIQUE INDEX uq_service_subcategories_category_name_ci
    ON service_subcategories (category_id, lower(name));

CREATE INDEX idx_service_subcategories_category
    ON service_subcategories (category_id, is_active, sort_order);

CREATE TRIGGER trg_service_subcategories_updated_at
BEFORE UPDATE ON service_subcategories
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 4. REPAIR SERVICES
-- ============================================================
-- Exact service is the matching unit.
--
-- workflow_type controls operational flow:
--   FIXED_PRICE
--   DIAGNOSIS_REQUIRED
--
-- pricing_model controls customer-facing price presentation:
--   FIXED
--   STARTING_FROM
--   HOURLY
--   INSPECTION_REQUIRED
--   QUOTE_REQUIRED
-- ============================================================

CREATE TABLE repair_services (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    subcategory_id          UUID NOT NULL
                            REFERENCES service_subcategories(id)
                            ON UPDATE RESTRICT
                            ON DELETE RESTRICT,

    code                    VARCHAR(80) NOT NULL,
    name                    VARCHAR(160) NOT NULL,
    description             TEXT,

    workflow_type           VARCHAR(30) NOT NULL,
    default_pricing_model   VARCHAR(30) NOT NULL,

    default_price_amount    NUMERIC(12,2),
    currency_code           CHAR(3) NOT NULL DEFAULT 'MVR',

    estimated_duration_min  INTEGER,

    requires_photo          BOOLEAN NOT NULL DEFAULT FALSE,
    allows_video            BOOLEAN NOT NULL DEFAULT TRUE,
    requires_inspection     BOOLEAN NOT NULL DEFAULT FALSE,

    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured             BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order              INTEGER NOT NULL DEFAULT 0,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT repair_services_code_not_blank
        CHECK (btrim(code) <> ''),

    CONSTRAINT repair_services_name_not_blank
        CHECK (btrim(name) <> ''),

    CONSTRAINT repair_services_workflow_type_valid
        CHECK (
            workflow_type IN (
                'FIXED_PRICE',
                'DIAGNOSIS_REQUIRED'
            )
        ),

    CONSTRAINT repair_services_pricing_model_valid
        CHECK (
            default_pricing_model IN (
                'FIXED',
                'STARTING_FROM',
                'HOURLY',
                'INSPECTION_REQUIRED',
                'QUOTE_REQUIRED'
            )
        ),

    CONSTRAINT repair_services_default_price_valid
        CHECK (
            default_price_amount IS NULL
            OR default_price_amount >= 0
        ),

    CONSTRAINT repair_services_price_required_when_numeric
        CHECK (
            default_pricing_model NOT IN (
                'FIXED',
                'STARTING_FROM',
                'HOURLY'
            )
            OR default_price_amount IS NOT NULL
        ),

    CONSTRAINT repair_services_currency_valid
        CHECK (currency_code ~ '^[A-Z]{3}$'),

    CONSTRAINT repair_services_duration_valid
        CHECK (
            estimated_duration_min IS NULL
            OR estimated_duration_min > 0
        ),

    CONSTRAINT repair_services_sort_nonnegative
        CHECK (sort_order >= 0),

    CONSTRAINT repair_services_diagnosis_consistency
        CHECK (
            workflow_type <> 'DIAGNOSIS_REQUIRED'
            OR default_pricing_model IN (
                'STARTING_FROM',
                'HOURLY',
                'INSPECTION_REQUIRED',
                'QUOTE_REQUIRED'
            )
        ),

    CONSTRAINT repair_services_inspection_consistency
        CHECK (
            requires_inspection = FALSE
            OR workflow_type = 'DIAGNOSIS_REQUIRED'
        ),

    CONSTRAINT uq_repair_services_code
        UNIQUE (code)
);

CREATE UNIQUE INDEX uq_repair_services_subcategory_name_ci
    ON repair_services (subcategory_id, lower(name));

CREATE INDEX idx_repair_services_subcategory
    ON repair_services (subcategory_id, is_active, sort_order);

CREATE INDEX idx_repair_services_workflow
    ON repair_services (workflow_type, is_active);

CREATE INDEX idx_repair_services_featured
    ON repair_services (is_featured, sort_order)
    WHERE is_active = TRUE;

CREATE TRIGGER trg_repair_services_updated_at
BEFORE UPDATE ON repair_services
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 5. BIND REPAIR REQUESTS TO EXACT SERVICE MASTER
-- ============================================================
-- Migration 0001 intentionally created service_id before the
-- catalogue table existed. It becomes a strict FK here.
-- ============================================================

ALTER TABLE repair_requests
    ADD CONSTRAINT fk_repair_requests_service
    FOREIGN KEY (service_id)
    REFERENCES repair_services(id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT;


-- ============================================================
-- 6. SERVICE WORKFLOW CONSISTENCY TRIGGER
-- ============================================================
-- repair_requests.workflow_type is retained as a historical snapshot.
-- At request creation it must match the active exact service's configured
-- workflow. Later catalogue edits therefore do not rewrite history.
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_repair_request_service_workflow()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_workflow_type VARCHAR(30);
    v_service_active BOOLEAN;
BEGIN
    SELECT workflow_type, is_active
      INTO v_workflow_type, v_service_active
      FROM repair_services
     WHERE id = NEW.service_id;

    IF v_workflow_type IS NULL THEN
        RAISE EXCEPTION 'Unknown repair service: %', NEW.service_id;
    END IF;

    IF TG_OP = 'INSERT' OR NEW.service_id IS DISTINCT FROM OLD.service_id THEN
        IF v_service_active = FALSE THEN
            RAISE EXCEPTION 'Inactive repair service cannot be used for a new request';
        END IF;
    END IF;

    IF NEW.workflow_type <> v_workflow_type THEN
        RAISE EXCEPTION
            'Repair request workflow_type % does not match service workflow_type %',
            NEW.workflow_type,
            v_workflow_type;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_repair_request_service_workflow
BEFORE INSERT OR UPDATE OF service_id, workflow_type
ON repair_requests
FOR EACH ROW
EXECUTE FUNCTION enforce_repair_request_service_workflow();


-- ============================================================
-- 7. INITIAL SERVICE CATEGORY SEED
-- ============================================================
-- These are configurable master-data seeds, not hard-coded limits.
-- Exact subcategories/services will be expanded through seed migrations
-- or admin-controlled catalogue management.
-- ============================================================

INSERT INTO service_categories (code, name, sort_order, is_featured)
VALUES
    ('AC_SERVICES', 'AC Services', 10, TRUE),
    ('PLUMBING', 'Plumbing', 20, TRUE),
    ('ELECTRICAL', 'Electrical', 30, TRUE),
    ('CARPENTRY', 'Carpentry', 40, TRUE),
    ('PAINTING', 'Painting', 50, FALSE),
    ('APPLIANCE_REPAIR', 'Appliance Installation & Repair', 60, FALSE),
    ('CCTV_NETWORKING_WIFI', 'CCTV / Networking / Wi-Fi', 70, FALSE),
    ('DOOR_LOCK', 'Door & Lock Services', 80, FALSE),
    ('ALUMINIUM_GLASS', 'Aluminium & Glass', 90, FALSE),
    ('FURNITURE_ASSEMBLY', 'Furniture Assembly', 100, FALSE),
    ('WATER_PUMP_TANK', 'Water Pump & Tank Maintenance', 110, FALSE),
    ('GENERAL_HANDYMAN', 'General Handyman', 120, TRUE),
    ('CLEANING', 'Cleaning', 130, FALSE),
    ('MOVING_LOADING', 'Moving & Loading', 140, FALSE),
    ('SMALL_RENOVATION', 'Small Renovation', 150, FALSE)
ON CONFLICT (code) DO NOTHING;


-- ============================================================
-- 8. LOCATION MASTER DATA POLICY
-- ============================================================
-- This migration establishes the canonical location architecture.
-- Production Maldives atoll/island seed data must be loaded from a
-- reviewed authoritative dataset in a dedicated data migration.
--
-- Rules:
--   * country is fixed to Maldives at application/config level
--   * atolls.id and islands.id are authoritative identifiers
--   * aliases are never matching identifiers
--   * disabled islands remain referenced historically
--   * matching uses service_island_id / service_atoll_id only
-- ============================================================

COMMIT;
