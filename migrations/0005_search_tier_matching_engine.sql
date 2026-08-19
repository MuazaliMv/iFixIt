-- ============================================================
-- iFixIt
-- Migration 0005: Provider Search & Tier-Based Matching Engine
-- PostgreSQL
--
-- Depends on:
--   0001_core_domain.sql
--   0002_auth_rbac.sql
--   0003_location_catalogue.sql
--   0004_provider_onboarding_service_areas_availability.sql
--
-- Adds:
--   provider_matching_metrics
--   matching_attempts
--   matching_candidates
--   repair_leads
--   repair_assignments
--   direct_booking_fallback_decisions
--   provider search/matching helper functions
--   concurrency-safe exclusive acceptance function
--
-- Core guarantees:
--   * exact repair service required
--   * canonical atoll/island IDs only
--   * Tier 0 = same operational-base island
--   * Tier 1 = explicit provider service-area island
--   * Tier 2 = same-atoll only when request scope permits
--   * Tier 3 = cross-atoll only with explicit request consent/scope
--   * Direct Booking never silently broadens to Smart Matching
--   * every matching stage is audited
--   * acceptance is atomic and creates at most one active assignment
--   * UI/ranking can never bypass provider hard eligibility
--
-- Subscription note:
-- Provider subscriptions are implemented later in the approved build order.
-- provider_matching_metrics.subscription_eligible is an explicit integration
-- gate. Migration 0010 will bind/recalculate this value from authoritative
-- subscription state; until then it defaults TRUE so this migration does not
-- invent a competing subscription schema.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. PROVIDER MATCHING METRICS / ENTITLEMENT GATE
-- ============================================================
-- Operational/ranking snapshot only. These metrics never override hard
-- eligibility, geography, exact service, verification, suspension or
-- availability rules.
-- ============================================================

CREATE TABLE provider_matching_metrics (
    provider_id                 UUID PRIMARY KEY
                                REFERENCES provider_profiles(id)
                                ON UPDATE RESTRICT
                                ON DELETE CASCADE,

    subscription_eligible       BOOLEAN NOT NULL DEFAULT TRUE,

    rating_average              NUMERIC(3,2),
    rating_count                INTEGER NOT NULL DEFAULT 0,

    acceptance_rate             NUMERIC(5,2),
    completion_rate             NUMERIC(5,2),
    average_response_seconds    INTEGER,
    active_job_count            INTEGER NOT NULL DEFAULT 0,

    last_recalculated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT provider_matching_rating_valid
        CHECK (rating_average IS NULL OR rating_average BETWEEN 0 AND 5),

    CONSTRAINT provider_matching_rating_count_valid
        CHECK (rating_count >= 0),

    CONSTRAINT provider_matching_acceptance_rate_valid
        CHECK (acceptance_rate IS NULL OR acceptance_rate BETWEEN 0 AND 100),

    CONSTRAINT provider_matching_completion_rate_valid
        CHECK (completion_rate IS NULL OR completion_rate BETWEEN 0 AND 100),

    CONSTRAINT provider_matching_response_valid
        CHECK (average_response_seconds IS NULL OR average_response_seconds >= 0),

    CONSTRAINT provider_matching_active_jobs_valid
        CHECK (active_job_count >= 0)
);

CREATE INDEX idx_provider_matching_metrics_ranking
    ON provider_matching_metrics (
        subscription_eligible,
        rating_average DESC NULLS LAST,
        acceptance_rate DESC NULLS LAST,
        average_response_seconds ASC NULLS LAST
    );

CREATE TRIGGER trg_provider_matching_metrics_updated_at
BEFORE UPDATE ON provider_matching_metrics
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- Seed a metrics row for every current provider.
INSERT INTO provider_matching_metrics (provider_id)
SELECT id
FROM provider_profiles
ON CONFLICT (provider_id) DO NOTHING;


-- Keep a metrics row available for newly-created provider profiles.
CREATE OR REPLACE FUNCTION ensure_provider_matching_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO provider_matching_metrics (provider_id)
    VALUES (NEW.id)
    ON CONFLICT (provider_id) DO NOTHING;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_provider_profile_matching_metrics
AFTER INSERT ON provider_profiles
FOR EACH ROW
EXECUTE FUNCTION ensure_provider_matching_metrics();


-- ============================================================
-- 2. MATCHING ATTEMPTS
-- ============================================================
-- One repair request may have many attempts/stages. Every broadening step is
-- visible and auditable rather than silently changing geographic scope.
-- ============================================================

CREATE TABLE matching_attempts (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    repair_request_id       UUID NOT NULL
                            REFERENCES repair_requests(id)
                            ON UPDATE RESTRICT
                            ON DELETE RESTRICT,

    attempt_no              INTEGER NOT NULL,
    matching_mode           VARCHAR(30) NOT NULL,
    geographic_tier         SMALLINT NOT NULL,

    service_id              UUID NOT NULL
                            REFERENCES repair_services(id)
                            ON UPDATE RESTRICT
                            ON DELETE RESTRICT,

    target_atoll_id         UUID NOT NULL,
    target_island_id        UUID NOT NULL,

    algorithm_version       VARCHAR(40) NOT NULL DEFAULT 'MATCH_V1',

    status                  VARCHAR(30) NOT NULL DEFAULT 'STARTED',

    eligible_provider_count INTEGER,
    offered_provider_count  INTEGER NOT NULL DEFAULT 0,

    started_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at            TIMESTAMPTZ,

    failure_reason          VARCHAR(80),
    metadata                JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_matching_attempt_number
        UNIQUE (repair_request_id, attempt_no),

    CONSTRAINT fk_matching_attempt_location
        FOREIGN KEY (target_island_id, target_atoll_id)
        REFERENCES islands (id, atoll_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    CONSTRAINT matching_attempt_no_valid
        CHECK (attempt_no > 0),

    CONSTRAINT matching_mode_valid
        CHECK (
            matching_mode IN (
                'DIRECT_PROVIDER',
                'SMART_MATCHING',
                'ADMIN_ASSIGNMENT'
            )
        ),

    CONSTRAINT matching_tier_valid
        CHECK (geographic_tier BETWEEN 0 AND 3),

    CONSTRAINT matching_attempt_status_valid
        CHECK (
            status IN (
                'STARTED',
                'CANDIDATES_FOUND',
                'OFFERS_CREATED',
                'ASSIGNED',
                'NO_MATCH',
                'EXPIRED',
                'CANCELLED',
                'FAILED'
            )
        ),

    CONSTRAINT matching_attempt_counts_valid
        CHECK (
            (eligible_provider_count IS NULL OR eligible_provider_count >= 0)
            AND offered_provider_count >= 0
        ),

    CONSTRAINT matching_attempt_completion_valid
        CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE INDEX idx_matching_attempts_request
    ON matching_attempts (repair_request_id, attempt_no DESC);

CREATE INDEX idx_matching_attempts_status
    ON matching_attempts (status, started_at);

CREATE INDEX idx_matching_attempts_geo
    ON matching_attempts (target_island_id, geographic_tier, started_at);


-- ============================================================
-- 3. MATCHING CANDIDATES
-- ============================================================
-- Stores provider scoring/reason snapshots per attempt.
-- Hard eligibility is separated from ranking score.
-- ============================================================

CREATE TABLE matching_candidates (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    matching_attempt_id         UUID NOT NULL
                                REFERENCES matching_attempts(id)
                                ON UPDATE RESTRICT
                                ON DELETE CASCADE,

    provider_id                 UUID NOT NULL
                                REFERENCES provider_profiles(id)
                                ON UPDATE RESTRICT
                                ON DELETE RESTRICT,

    geographic_tier             SMALLINT NOT NULL,

    hard_eligible               BOOLEAN NOT NULL,
    eligibility_reason          VARCHAR(80),

    availability_eligible       BOOLEAN NOT NULL DEFAULT TRUE,
    subscription_eligible       BOOLEAN NOT NULL DEFAULT TRUE,

    geographic_score            NUMERIC(8,3) NOT NULL DEFAULT 0,
    availability_score          NUMERIC(8,3) NOT NULL DEFAULT 0,
    rating_score                NUMERIC(8,3) NOT NULL DEFAULT 0,
    response_score              NUMERIC(8,3) NOT NULL DEFAULT 0,
    workload_score              NUMERIC(8,3) NOT NULL DEFAULT 0,
    final_score                 NUMERIC(10,3) NOT NULL DEFAULT 0,

    rank_position               INTEGER,

    score_explanation           JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_matching_candidate
        UNIQUE (matching_attempt_id, provider_id),

    CONSTRAINT matching_candidate_tier_valid
        CHECK (geographic_tier BETWEEN 0 AND 3),

    CONSTRAINT matching_candidate_rank_valid
        CHECK (rank_position IS NULL OR rank_position > 0)
);

CREATE INDEX idx_matching_candidates_rank
    ON matching_candidates (
        matching_attempt_id,
        hard_eligible,
        final_score DESC,
        rank_position
    );

CREATE INDEX idx_matching_candidates_provider
    ON matching_candidates (provider_id, created_at DESC);


-- ============================================================
-- 4. REPAIR LEADS / PROVIDER OFFERS
-- ============================================================
-- Each offer is addressed to exactly one provider. Broadcast/progressive
-- strategies can create multiple rows, but only one provider may ultimately
-- hold the active assignment.
-- ============================================================

CREATE TABLE repair_leads (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    repair_request_id       UUID NOT NULL
                            REFERENCES repair_requests(id)
                            ON UPDATE RESTRICT
                            ON DELETE RESTRICT,

    matching_attempt_id     UUID
                            REFERENCES matching_attempts(id)
                            ON UPDATE RESTRICT
                            ON DELETE SET NULL,

    provider_id             UUID NOT NULL
                            REFERENCES provider_profiles(id)
                            ON UPDATE RESTRICT
                            ON DELETE RESTRICT,

    geographic_tier         SMALLINT NOT NULL,

    status                  VARCHAR(30) NOT NULL DEFAULT 'NEW',

    offered_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    viewed_at               TIMESTAMPTZ,
    responded_at            TIMESTAMPTZ,
    expires_at              TIMESTAMPTZ NOT NULL,

    decline_reason          VARCHAR(100),
    provider_message        TEXT,

    offer_channel           VARCHAR(20) NOT NULL DEFAULT 'IN_APP',

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_repair_lead_provider
        UNIQUE (repair_request_id, provider_id, matching_attempt_id),

    CONSTRAINT repair_lead_tier_valid
        CHECK (geographic_tier BETWEEN 0 AND 3),

    CONSTRAINT repair_lead_status_valid
        CHECK (
            status IN (
                'NEW',
                'VIEWED',
                'ACCEPTED',
                'DECLINED',
                'EXPIRED',
                'CANCELLED',
                'LOST_RACE'
            )
        ),

    CONSTRAINT repair_lead_channel_valid
        CHECK (
            offer_channel IN (
                'IN_APP',
                'WEB',
                'WHATSAPP',
                'SMS',
                'ADMIN'
            )
        ),

    CONSTRAINT repair_lead_expiry_valid
        CHECK (expires_at > offered_at),

    CONSTRAINT repair_lead_response_time_valid
        CHECK (responded_at IS NULL OR responded_at >= offered_at)
);

CREATE INDEX idx_repair_leads_provider_inbox
    ON repair_leads (provider_id, status, offered_at DESC);

CREATE INDEX idx_repair_leads_request
    ON repair_leads (repair_request_id, status, offered_at DESC);

CREATE INDEX idx_repair_leads_expiry
    ON repair_leads (expires_at)
    WHERE status IN ('NEW', 'VIEWED');

CREATE TRIGGER trg_repair_leads_updated_at
BEFORE UPDATE ON repair_leads
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 5. REPAIR ASSIGNMENTS
-- ============================================================
-- Exactly one current active assignment per request.
-- Historical assignments remain preserved.
-- ============================================================

CREATE TABLE repair_assignments (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    repair_request_id       UUID NOT NULL
                            REFERENCES repair_requests(id)
                            ON UPDATE RESTRICT
                            ON DELETE RESTRICT,

    provider_id             UUID NOT NULL
                            REFERENCES provider_profiles(id)
                            ON UPDATE RESTRICT
                            ON DELETE RESTRICT,

    accepted_lead_id        UUID
                            REFERENCES repair_leads(id)
                            ON UPDATE RESTRICT
                            ON DELETE SET NULL,

    assignment_source       VARCHAR(30) NOT NULL,
    geographic_tier         SMALLINT NOT NULL,

    status                  VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',

    assigned_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at                TIMESTAMPTZ,
    end_reason              VARCHAR(100),

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT repair_assignment_source_valid
        CHECK (
            assignment_source IN (
                'DIRECT_PROVIDER',
                'SMART_MATCHING',
                'ADMIN_ASSIGNMENT'
            )
        ),

    CONSTRAINT repair_assignment_tier_valid
        CHECK (geographic_tier BETWEEN 0 AND 3),

    CONSTRAINT repair_assignment_status_valid
        CHECK (
            status IN (
                'ACTIVE',
                'COMPLETED',
                'CANCELLED',
                'REASSIGNED',
                'WITHDRAWN'
            )
        ),

    CONSTRAINT repair_assignment_end_consistency
        CHECK (
            (status = 'ACTIVE' AND ended_at IS NULL)
            OR
            (status <> 'ACTIVE' AND ended_at IS NOT NULL)
        )
);

CREATE UNIQUE INDEX uq_repair_assignment_one_active
    ON repair_assignments (repair_request_id)
    WHERE status = 'ACTIVE';

CREATE INDEX idx_repair_assignments_provider_active
    ON repair_assignments (provider_id, assigned_at DESC)
    WHERE status = 'ACTIVE';

CREATE INDEX idx_repair_assignments_request_history
    ON repair_assignments (repair_request_id, assigned_at DESC);

CREATE TRIGGER trg_repair_assignments_updated_at
BEFORE UPDATE ON repair_assignments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 6. DIRECT BOOKING FALLBACK DECISIONS
-- ============================================================
-- Direct requests may not silently become Smart Matching. Customer choice is
-- recorded before broadening.
-- ============================================================

CREATE TABLE direct_booking_fallback_decisions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    repair_request_id       UUID NOT NULL
                            REFERENCES repair_requests(id)
                            ON UPDATE RESTRICT
                            ON DELETE RESTRICT,

    original_provider_id    UUID NOT NULL
                            REFERENCES provider_profiles(id)
                            ON UPDATE RESTRICT
                            ON DELETE RESTRICT,

    trigger_reason          VARCHAR(30) NOT NULL,
    customer_decision       VARCHAR(40) NOT NULL,

    decided_by_customer_id  UUID NOT NULL
                            REFERENCES users(id)
                            ON UPDATE RESTRICT
                            ON DELETE RESTRICT,

    decided_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT direct_fallback_trigger_valid
        CHECK (
            trigger_reason IN (
                'PROVIDER_DECLINED',
                'OFFER_EXPIRED',
                'PROVIDER_UNAVAILABLE',
                'PROVIDER_INELIGIBLE'
            )
        ),

    CONSTRAINT direct_fallback_decision_valid
        CHECK (
            customer_decision IN (
                'CONVERT_TO_SMART_MATCHING',
                'CHOOSE_ANOTHER_PROVIDER',
                'CANCEL_REQUEST'
            )
        )
);

CREATE INDEX idx_direct_booking_fallback_request
    ON direct_booking_fallback_decisions (repair_request_id, decided_at DESC);


-- ============================================================
-- 7. HARD PROVIDER ELIGIBILITY FUNCTION
-- ============================================================
-- Returns whether a provider can participate in marketplace matching for an
-- exact service. Geography and request-specific tier checks happen separately.
-- ============================================================

CREATE OR REPLACE FUNCTION provider_is_hard_eligible(
    p_provider_id UUID,
    p_service_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
          FROM provider_profiles pp
          JOIN provider_services ps
            ON ps.provider_id = pp.id
           AND ps.service_id = p_service_id
           AND ps.status = 'ACTIVE'
          JOIN repair_services rs
            ON rs.id = ps.service_id
           AND rs.is_active = TRUE
          JOIN provider_matching_metrics pmm
            ON pmm.provider_id = pp.id
         WHERE pp.id = p_provider_id
           AND pp.approval_status = 'APPROVED'
           AND pp.verification_status = 'VERIFIED'
           AND pp.marketplace_status = 'ACTIVE'
           AND pp.is_suspended = FALSE
           AND pp.accepting_leads = TRUE
           AND pp.operational_base_island_id IS NOT NULL
           AND pmm.subscription_eligible = TRUE
    );
$$;


-- ============================================================
-- 8. GEOGRAPHIC TIER FUNCTION
-- ============================================================
-- Returns NULL when provider is not geographically eligible under the request's
-- currently authorized matching_scope.
--
-- Tier 0: operational base island == target island
-- Tier 1: explicit active service area == target island
-- Tier 2: provider base/approved area in same target atoll and scope permits
-- Tier 3: other atoll only when CROSS_ATOLL_ALLOWED and consent exists
-- ============================================================

CREATE OR REPLACE FUNCTION provider_geographic_tier(
    p_provider_id UUID,
    p_target_atoll_id UUID,
    p_target_island_id UUID,
    p_matching_scope VARCHAR,
    p_cross_atoll_consent_at TIMESTAMPTZ
)
RETURNS SMALLINT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_base_atoll UUID;
    v_base_island UUID;
    v_has_target_area BOOLEAN;
    v_has_same_atoll_area BOOLEAN;
BEGIN
    SELECT operational_base_atoll_id, operational_base_island_id
      INTO v_base_atoll, v_base_island
      FROM provider_profiles
     WHERE id = p_provider_id;

    IF v_base_island IS NULL THEN
        RETURN NULL;
    END IF;

    -- Tier 0: physically based on the target island.
    IF v_base_island = p_target_island_id THEN
        RETURN 0;
    END IF;

    -- Tier 1: provider explicitly serves the target island.
    SELECT EXISTS (
        SELECT 1
          FROM provider_service_areas psa
         WHERE psa.provider_id = p_provider_id
           AND psa.island_id = p_target_island_id
           AND psa.is_active = TRUE
    ) INTO v_has_target_area;

    IF v_has_target_area THEN
        RETURN 1;
    END IF;

    -- Tier 2 only when same-atoll fallback is authorized.
    IF p_matching_scope IN ('SAME_ATOLL_ALLOWED', 'CROSS_ATOLL_ALLOWED') THEN
        IF v_base_atoll = p_target_atoll_id THEN
            RETURN 2;
        END IF;

        SELECT EXISTS (
            SELECT 1
              FROM provider_service_areas psa
             WHERE psa.provider_id = p_provider_id
               AND psa.atoll_id = p_target_atoll_id
               AND psa.is_active = TRUE
        ) INTO v_has_same_atoll_area;

        IF v_has_same_atoll_area THEN
            RETURN 2;
        END IF;
    END IF;

    -- Tier 3 is never implicit.
    IF p_matching_scope = 'CROSS_ATOLL_ALLOWED'
       AND p_cross_atoll_consent_at IS NOT NULL THEN
        RETURN 3;
    END IF;

    RETURN NULL;
END;
$$;


-- ============================================================
-- 9. PROVIDER SEARCH VIEW
-- ============================================================
-- Search surfaces hard-eligible providers and core ranking attributes.
-- Request-specific geography still uses provider_geographic_tier().
-- ============================================================

CREATE VIEW provider_search_index AS
SELECT
    pp.id AS provider_id,
    pp.user_id,
    pp.provider_type,
    pp.public_name,
    pp.business_name,
    pp.description,
    pp.experience_years,
    pp.profile_photo_url,
    pp.operational_base_atoll_id,
    pp.operational_base_island_id,
    pp.availability_status,
    pp.accepting_leads,
    ps.service_id,
    psp.pricing_model,
    psp.base_amount,
    psp.currency_code,
    pmm.rating_average,
    pmm.rating_count,
    pmm.acceptance_rate,
    pmm.completion_rate,
    pmm.average_response_seconds,
    pmm.active_job_count,
    pmm.subscription_eligible
FROM provider_profiles pp
JOIN provider_services ps
  ON ps.provider_id = pp.id
 AND ps.status = 'ACTIVE'
JOIN repair_services rs
  ON rs.id = ps.service_id
 AND rs.is_active = TRUE
LEFT JOIN provider_service_pricing psp
  ON psp.provider_service_id = ps.id
 AND psp.is_active = TRUE
 AND psp.effective_to IS NULL
JOIN provider_matching_metrics pmm
  ON pmm.provider_id = pp.id
WHERE pp.approval_status = 'APPROVED'
  AND pp.verification_status = 'VERIFIED'
  AND pp.marketplace_status = 'ACTIVE'
  AND pp.is_suspended = FALSE
  AND pp.accepting_leads = TRUE
  AND pmm.subscription_eligible = TRUE;


-- ============================================================
-- 10. CREATE MATCHING ATTEMPT + CANDIDATE SNAPSHOT
-- ============================================================
-- This function creates the next audited attempt for a request and snapshots
-- all hard-eligible/geographically eligible candidates at the requested tier.
-- Ranking formula is deliberately simple/configurable for MVP; later code can
-- version the algorithm without rewriting historical candidate scores.
-- ============================================================

CREATE OR REPLACE FUNCTION create_matching_attempt(
    p_repair_request_id UUID,
    p_geographic_tier SMALLINT,
    p_matching_mode VARCHAR DEFAULT 'SMART_MATCHING'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_request repair_requests%ROWTYPE;
    v_attempt_id UUID;
    v_attempt_no INTEGER;
BEGIN
    IF p_geographic_tier < 0 OR p_geographic_tier > 3 THEN
        RAISE EXCEPTION 'Invalid geographic tier: %', p_geographic_tier;
    END IF;

    SELECT *
      INTO v_request
      FROM repair_requests
     WHERE id = p_repair_request_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Repair request not found: %', p_repair_request_id;
    END IF;

    IF v_request.status IN ('COMPLETED', 'CANCELLED', 'EXPIRED') THEN
        RAISE EXCEPTION 'Request is not matchable in status %', v_request.status;
    END IF;

    IF p_geographic_tier = 2
       AND v_request.matching_scope NOT IN ('SAME_ATOLL_ALLOWED', 'CROSS_ATOLL_ALLOWED') THEN
        RAISE EXCEPTION 'Tier 2 is not authorized by request matching scope';
    END IF;

    IF p_geographic_tier = 3
       AND (
            v_request.matching_scope <> 'CROSS_ATOLL_ALLOWED'
            OR v_request.cross_atoll_consent_at IS NULL
       ) THEN
        RAISE EXCEPTION 'Tier 3 requires explicit cross-atoll authorization';
    END IF;

    SELECT COALESCE(MAX(attempt_no), 0) + 1
      INTO v_attempt_no
      FROM matching_attempts
     WHERE repair_request_id = p_repair_request_id;

    INSERT INTO matching_attempts (
        repair_request_id,
        attempt_no,
        matching_mode,
        geographic_tier,
        service_id,
        target_atoll_id,
        target_island_id
    ) VALUES (
        v_request.id,
        v_attempt_no,
        p_matching_mode,
        p_geographic_tier,
        v_request.service_id,
        v_request.service_atoll_id,
        v_request.service_island_id
    )
    RETURNING id INTO v_attempt_id;

    INSERT INTO matching_candidates (
        matching_attempt_id,
        provider_id,
        geographic_tier,
        hard_eligible,
        availability_eligible,
        subscription_eligible,
        geographic_score,
        availability_score,
        rating_score,
        response_score,
        workload_score,
        final_score,
        score_explanation
    )
    SELECT
        v_attempt_id,
        psi.provider_id,
        p_geographic_tier,
        TRUE,
        (psi.availability_status <> 'UNAVAILABLE'),
        psi.subscription_eligible,
        CASE p_geographic_tier
            WHEN 0 THEN 100
            WHEN 1 THEN 80
            WHEN 2 THEN 50
            WHEN 3 THEN 20
        END::NUMERIC,
        CASE psi.availability_status
            WHEN 'AVAILABLE_NOW' THEN 30
            WHEN 'AVAILABLE_TODAY' THEN 20
            WHEN 'BY_APPOINTMENT' THEN 10
            ELSE 0
        END::NUMERIC,
        COALESCE(psi.rating_average, 0) * 4,
        CASE
            WHEN psi.average_response_seconds IS NULL THEN 0
            WHEN psi.average_response_seconds <= 300 THEN 15
            WHEN psi.average_response_seconds <= 900 THEN 10
            WHEN psi.average_response_seconds <= 3600 THEN 5
            ELSE 0
        END::NUMERIC,
        GREATEST(0, 10 - COALESCE(psi.active_job_count, 0))::NUMERIC,
        (
            CASE p_geographic_tier
                WHEN 0 THEN 100
                WHEN 1 THEN 80
                WHEN 2 THEN 50
                WHEN 3 THEN 20
            END
            + CASE psi.availability_status
                WHEN 'AVAILABLE_NOW' THEN 30
                WHEN 'AVAILABLE_TODAY' THEN 20
                WHEN 'BY_APPOINTMENT' THEN 10
                ELSE 0
              END
            + COALESCE(psi.rating_average, 0) * 4
            + CASE
                WHEN psi.average_response_seconds IS NULL THEN 0
                WHEN psi.average_response_seconds <= 300 THEN 15
                WHEN psi.average_response_seconds <= 900 THEN 10
                WHEN psi.average_response_seconds <= 3600 THEN 5
                ELSE 0
              END
            + GREATEST(0, 10 - COALESCE(psi.active_job_count, 0))
        )::NUMERIC,
        jsonb_build_object(
            'algorithm', 'MATCH_V1',
            'tier', p_geographic_tier,
            'availability', psi.availability_status,
            'ratingAverage', psi.rating_average,
            'responseSeconds', psi.average_response_seconds,
            'activeJobs', psi.active_job_count
        )
    FROM provider_search_index psi
    WHERE psi.service_id = v_request.service_id
      AND provider_geographic_tier(
            psi.provider_id,
            v_request.service_atoll_id,
            v_request.service_island_id,
            v_request.matching_scope,
            v_request.cross_atoll_consent_at
          ) = p_geographic_tier;

    -- Stable rank within this attempt.
    WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (
                   ORDER BY final_score DESC, provider_id
               ) AS rn
          FROM matching_candidates
         WHERE matching_attempt_id = v_attempt_id
           AND hard_eligible = TRUE
           AND availability_eligible = TRUE
           AND subscription_eligible = TRUE
    )
    UPDATE matching_candidates mc
       SET rank_position = ranked.rn
      FROM ranked
     WHERE mc.id = ranked.id;

    UPDATE matching_attempts
       SET eligible_provider_count = (
               SELECT COUNT(*)
                 FROM matching_candidates
                WHERE matching_attempt_id = v_attempt_id
                  AND hard_eligible = TRUE
                  AND availability_eligible = TRUE
                  AND subscription_eligible = TRUE
           ),
           status = CASE
               WHEN EXISTS (
                   SELECT 1
                     FROM matching_candidates
                    WHERE matching_attempt_id = v_attempt_id
                      AND hard_eligible = TRUE
                      AND availability_eligible = TRUE
                      AND subscription_eligible = TRUE
               ) THEN 'CANDIDATES_FOUND'
               ELSE 'NO_MATCH'
           END,
           completed_at = CASE
               WHEN NOT EXISTS (
                   SELECT 1
                     FROM matching_candidates
                    WHERE matching_attempt_id = v_attempt_id
                      AND hard_eligible = TRUE
                      AND availability_eligible = TRUE
                      AND subscription_eligible = TRUE
               ) THEN now()
               ELSE NULL
           END,
           failure_reason = CASE
               WHEN NOT EXISTS (
                   SELECT 1
                     FROM matching_candidates
                    WHERE matching_attempt_id = v_attempt_id
                      AND hard_eligible = TRUE
                      AND availability_eligible = TRUE
                      AND subscription_eligible = TRUE
               ) THEN 'NO_ELIGIBLE_PROVIDER'
               ELSE NULL
           END
     WHERE id = v_attempt_id;

    IF v_request.status IN ('SUBMITTED', 'AWAITING_ASSIGNMENT') THEN
        UPDATE repair_requests
           SET status = 'AWAITING_ASSIGNMENT'
         WHERE id = v_request.id;
    END IF;

    RETURN v_attempt_id;
END;
$$;


-- ============================================================
-- 11. CREATE PROVIDER OFFERS FROM RANKED CANDIDATES
-- ============================================================
-- The caller selects how many ranked candidates to offer. This supports
-- progressive matching now and can support broadcast strategies later.
-- ============================================================

CREATE OR REPLACE FUNCTION create_ranked_provider_offers(
    p_matching_attempt_id UUID,
    p_offer_count INTEGER,
    p_expires_at TIMESTAMPTZ,
    p_offer_channel VARCHAR DEFAULT 'IN_APP'
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_attempt matching_attempts%ROWTYPE;
    v_inserted INTEGER;
BEGIN
    IF p_offer_count <= 0 THEN
        RAISE EXCEPTION 'Offer count must be positive';
    END IF;

    IF p_expires_at <= now() THEN
        RAISE EXCEPTION 'Offer expiry must be in the future';
    END IF;

    SELECT *
      INTO v_attempt
      FROM matching_attempts
     WHERE id = p_matching_attempt_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Matching attempt not found';
    END IF;

    IF v_attempt.status NOT IN ('CANDIDATES_FOUND', 'OFFERS_CREATED') THEN
        RAISE EXCEPTION 'Matching attempt cannot create offers in status %', v_attempt.status;
    END IF;

    INSERT INTO repair_leads (
        repair_request_id,
        matching_attempt_id,
        provider_id,
        geographic_tier,
        expires_at,
        offer_channel
    )
    SELECT
        v_attempt.repair_request_id,
        v_attempt.id,
        mc.provider_id,
        mc.geographic_tier,
        p_expires_at,
        p_offer_channel
    FROM matching_candidates mc
    WHERE mc.matching_attempt_id = v_attempt.id
      AND mc.hard_eligible = TRUE
      AND mc.availability_eligible = TRUE
      AND mc.subscription_eligible = TRUE
      AND mc.rank_position IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
            FROM repair_leads rl
           WHERE rl.repair_request_id = v_attempt.repair_request_id
             AND rl.provider_id = mc.provider_id
      )
    ORDER BY mc.rank_position
    LIMIT p_offer_count
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    UPDATE matching_attempts
       SET status = CASE WHEN v_inserted > 0 THEN 'OFFERS_CREATED' ELSE status END,
           offered_provider_count = offered_provider_count + v_inserted
     WHERE id = v_attempt.id;

    IF v_inserted > 0 THEN
        UPDATE repair_requests
           SET status = 'PROVIDER_OFFERED'
         WHERE id = v_attempt.repair_request_id
           AND status IN ('SUBMITTED', 'AWAITING_ASSIGNMENT', 'PROVIDER_OFFERED');
    END IF;

    RETURN v_inserted;
END;
$$;


-- ============================================================
-- 12. ATOMIC PROVIDER ACCEPTANCE
-- ============================================================
-- Critical concurrency boundary.
-- Locks the repair request and provider offer, re-checks provider eligibility,
-- verifies offer expiry, verifies geography, then creates the single active
-- assignment. The unique partial index provides a second DB-level guarantee.
-- ============================================================

CREATE OR REPLACE FUNCTION accept_repair_lead_atomic(
    p_lead_id UUID,
    p_provider_id UUID,
    p_provider_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_lead repair_leads%ROWTYPE;
    v_request repair_requests%ROWTYPE;
    v_assignment_id UUID;
    v_current_tier SMALLINT;
    v_assignment_source VARCHAR(30);
BEGIN
    SELECT *
      INTO v_lead
      FROM repair_leads
     WHERE id = p_lead_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lead not found';
    END IF;

    IF v_lead.provider_id <> p_provider_id THEN
        RAISE EXCEPTION 'Provider does not own this lead';
    END IF;

    SELECT *
      INTO v_request
      FROM repair_requests
     WHERE id = v_lead.repair_request_id
     FOR UPDATE;

    IF v_lead.status NOT IN ('NEW', 'VIEWED') THEN
        RAISE EXCEPTION 'Lead is not acceptable in status %', v_lead.status;
    END IF;

    IF v_lead.expires_at <= now() THEN
        UPDATE repair_leads
           SET status = 'EXPIRED',
               responded_at = now()
         WHERE id = v_lead.id;

        RAISE EXCEPTION 'Lead has expired';
    END IF;

    IF EXISTS (
        SELECT 1
          FROM repair_assignments
         WHERE repair_request_id = v_request.id
           AND status = 'ACTIVE'
    ) THEN
        UPDATE repair_leads
           SET status = 'LOST_RACE',
               responded_at = now()
         WHERE id = v_lead.id;

        RAISE EXCEPTION 'Request already has an active assignment';
    END IF;

    IF NOT provider_is_hard_eligible(p_provider_id, v_request.service_id) THEN
        RAISE EXCEPTION 'Provider is no longer eligible for this service';
    END IF;

    v_current_tier := provider_geographic_tier(
        p_provider_id,
        v_request.service_atoll_id,
        v_request.service_island_id,
        v_request.matching_scope,
        v_request.cross_atoll_consent_at
    );

    IF v_current_tier IS NULL OR v_current_tier <> v_lead.geographic_tier THEN
        RAISE EXCEPTION 'Provider no longer satisfies authorized geographic tier';
    END IF;

    v_assignment_source := CASE
        WHEN v_request.booking_model = 'DIRECT_PROVIDER' THEN 'DIRECT_PROVIDER'
        ELSE 'SMART_MATCHING'
    END;

    INSERT INTO repair_assignments (
        repair_request_id,
        provider_id,
        accepted_lead_id,
        assignment_source,
        geographic_tier
    ) VALUES (
        v_request.id,
        p_provider_id,
        v_lead.id,
        v_assignment_source,
        v_current_tier
    )
    RETURNING id INTO v_assignment_id;

    UPDATE repair_leads
       SET status = 'ACCEPTED',
           responded_at = now(),
           provider_message = p_provider_message
     WHERE id = v_lead.id;

    UPDATE repair_leads
       SET status = 'LOST_RACE',
           responded_at = COALESCE(responded_at, now())
     WHERE repair_request_id = v_request.id
       AND id <> v_lead.id
       AND status IN ('NEW', 'VIEWED');

    UPDATE repair_requests
       SET status = 'ACCEPTED'
     WHERE id = v_request.id;

    IF v_lead.matching_attempt_id IS NOT NULL THEN
        UPDATE matching_attempts
           SET status = 'ASSIGNED',
               completed_at = now()
         WHERE id = v_lead.matching_attempt_id;
    END IF;

    RETURN v_assignment_id;
END;
$$;


-- ============================================================
-- 13. DECLINE PROVIDER OFFER
-- ============================================================

CREATE OR REPLACE FUNCTION decline_repair_lead(
    p_lead_id UUID,
    p_provider_id UUID,
    p_decline_reason VARCHAR DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_lead repair_leads%ROWTYPE;
BEGIN
    SELECT *
      INTO v_lead
      FROM repair_leads
     WHERE id = p_lead_id
     FOR UPDATE;

    IF NOT FOUND OR v_lead.provider_id <> p_provider_id THEN
        RAISE EXCEPTION 'Lead not found for provider';
    END IF;

    IF v_lead.status NOT IN ('NEW', 'VIEWED') THEN
        RAISE EXCEPTION 'Lead cannot be declined in status %', v_lead.status;
    END IF;

    UPDATE repair_leads
       SET status = 'DECLINED',
           responded_at = now(),
           decline_reason = p_decline_reason
     WHERE id = v_lead.id;
END;
$$;


-- ============================================================
-- 14. EXPIRE STALE OFFERS
-- ============================================================
-- Intended for a background worker/cron job.
-- ============================================================

CREATE OR REPLACE FUNCTION expire_repair_leads()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE repair_leads
       SET status = 'EXPIRED',
           responded_at = COALESCE(responded_at, now())
     WHERE status IN ('NEW', 'VIEWED')
       AND expires_at <= now();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;


-- ============================================================
-- 15. DIRECT-BOOKING FALLBACK GUARD
-- ============================================================
-- Converting a DIRECT_PROVIDER request to SMART_MATCHING requires the customer
-- decision row recorded above.
-- ============================================================

CREATE OR REPLACE FUNCTION convert_direct_request_to_smart_matching(
    p_repair_request_id UUID,
    p_customer_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_request repair_requests%ROWTYPE;
BEGIN
    SELECT *
      INTO v_request
      FROM repair_requests
     WHERE id = p_repair_request_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Repair request not found';
    END IF;

    IF v_request.customer_id <> p_customer_id THEN
        RAISE EXCEPTION 'Customer does not own repair request';
    END IF;

    IF v_request.booking_model <> 'DIRECT_PROVIDER' THEN
        RAISE EXCEPTION 'Repair request is not a Direct Booking';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM direct_booking_fallback_decisions d
         WHERE d.repair_request_id = v_request.id
           AND d.decided_by_customer_id = p_customer_id
           AND d.customer_decision = 'CONVERT_TO_SMART_MATCHING'
    ) THEN
        RAISE EXCEPTION 'Explicit customer fallback decision is required';
    END IF;

    IF EXISTS (
        SELECT 1
          FROM repair_assignments
         WHERE repair_request_id = v_request.id
           AND status = 'ACTIVE'
    ) THEN
        RAISE EXCEPTION 'Assigned request cannot be converted to Smart Matching';
    END IF;

    UPDATE repair_requests
       SET booking_model = 'SMART_MATCHING',
           requested_provider_id = NULL,
           status = 'AWAITING_ASSIGNMENT'
     WHERE id = v_request.id;
END;
$$;


-- ============================================================
-- 16. SEARCH / MATCHING POLICY NOTES
-- ============================================================
-- Application/API rules to preserve:
--
-- 1. Public provider search may use provider_search_index but must resolve the
--    target location to canonical island/atoll IDs before geographic filtering.
-- 2. Featured/sponsored placement never bypasses provider_is_hard_eligible().
-- 3. Tier expansion must call create_matching_attempt() separately for each
--    stage so every fallback is auditable.
-- 4. Tier 3 is impossible unless matching_scope = CROSS_ATOLL_ALLOWED and
--    cross_atoll_consent_at is populated on repair_requests.
-- 5. Direct Booking decline/expiry must present the fallback decision to the
--    customer; convert_direct_request_to_smart_matching() enforces that choice.
-- 6. accept_repair_lead_atomic() is the authoritative acceptance path. API,
--    WhatsApp and SMS actions must all call this server-side function/service
--    rather than performing independent status updates.
-- 7. External WhatsApp/SMS action tokens must be short-lived, signed,
--    single-use and bound to lead/provider identity (implemented in API layer).
-- 8. Matching ranking is versioned. MATCH_V1 weights are an MVP baseline and
--    may be tuned later without changing hard eligibility or history.
-- ============================================================

COMMIT;
