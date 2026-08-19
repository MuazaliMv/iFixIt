-- ============================================================
-- iFixIt
-- Migration 0002: Authentication, OTP & RBAC Foundation
-- PostgreSQL
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ROLES
-- ============================================================

CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(50) NOT NULL,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    is_system       BOOLEAN NOT NULL DEFAULT TRUE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT roles_code_not_blank CHECK (btrim(code) <> ''),
    CONSTRAINT roles_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT uq_roles_code UNIQUE (code)
);

CREATE TRIGGER trg_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 2. PERMISSIONS
-- ============================================================

CREATE TABLE permissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(100) NOT NULL,
    name            VARCHAR(150) NOT NULL,
    description     TEXT,
    resource        VARCHAR(80) NOT NULL,
    action          VARCHAR(50) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT permissions_code_not_blank CHECK (btrim(code) <> ''),
    CONSTRAINT permissions_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT permissions_resource_not_blank CHECK (btrim(resource) <> ''),
    CONSTRAINT permissions_action_not_blank CHECK (btrim(action) <> ''),
    CONSTRAINT uq_permissions_code UNIQUE (code),
    CONSTRAINT uq_permissions_resource_action UNIQUE (resource, action)
);

CREATE INDEX idx_permissions_resource
    ON permissions (resource, action)
    WHERE is_active = TRUE;

CREATE TRIGGER trg_permissions_updated_at
BEFORE UPDATE ON permissions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 3. ROLE PERMISSIONS
-- ============================================================

CREATE TABLE role_permissions (
    role_id         UUID NOT NULL
                    REFERENCES roles(id)
                    ON UPDATE RESTRICT
                    ON DELETE CASCADE,
    permission_id   UUID NOT NULL
                    REFERENCES permissions(id)
                    ON UPDATE RESTRICT
                    ON DELETE CASCADE,
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by      UUID
                    REFERENCES users(id)
                    ON UPDATE RESTRICT
                    ON DELETE SET NULL,

    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_permission
    ON role_permissions (permission_id);


-- ============================================================
-- 4. USER ROLES
-- ============================================================
-- A single account may hold multiple roles, e.g. Customer + Provider.
-- Admin power is granted through permissions, not a client-side label.
-- ============================================================

CREATE TABLE user_roles (
    user_id         UUID NOT NULL
                    REFERENCES users(id)
                    ON UPDATE RESTRICT
                    ON DELETE CASCADE,
    role_id         UUID NOT NULL
                    REFERENCES roles(id)
                    ON UPDATE RESTRICT
                    ON DELETE RESTRICT,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by     UUID
                    REFERENCES users(id)
                    ON UPDATE RESTRICT
                    ON DELETE SET NULL,
    expires_at      TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,

    PRIMARY KEY (user_id, role_id),

    CONSTRAINT user_roles_expiry_valid
        CHECK (expires_at IS NULL OR expires_at > assigned_at)
);

CREATE INDEX idx_user_roles_active
    ON user_roles (user_id, role_id)
    WHERE is_active = TRUE;

CREATE INDEX idx_user_roles_role
    ON user_roles (role_id, user_id)
    WHERE is_active = TRUE;


-- ============================================================
-- 5. OTP CHALLENGES
-- ============================================================
-- Never store the raw OTP code.
-- otp_hash should be derived using a server-side keyed construction
-- or similarly strong OTP verification design.
-- ============================================================

CREATE TABLE otp_challenges (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_e164          VARCHAR(20) NOT NULL,
    purpose             VARCHAR(30) NOT NULL,
    otp_hash            TEXT NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    consumed_at         TIMESTAMPTZ,
    invalidated_at      TIMESTAMPTZ,
    attempt_count       SMALLINT NOT NULL DEFAULT 0,
    max_attempts        SMALLINT NOT NULL DEFAULT 5,
    resend_count        SMALLINT NOT NULL DEFAULT 0,
    delivery_channel    VARCHAR(20) NOT NULL DEFAULT 'SMS',
    provider_message_id VARCHAR(180),
    requested_ip        INET,
    requested_user_agent TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT otp_phone_format
        CHECK (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
    CONSTRAINT otp_purpose_valid
        CHECK (purpose IN (
            'LOGIN',
            'REGISTER',
            'PHONE_CHANGE',
            'SENSITIVE_ACTION'
        )),
    CONSTRAINT otp_channel_valid
        CHECK (delivery_channel IN ('SMS', 'WHATSAPP')),
    CONSTRAINT otp_attempt_count_valid
        CHECK (attempt_count >= 0 AND max_attempts BETWEEN 1 AND 20),
    CONSTRAINT otp_resend_count_valid
        CHECK (resend_count >= 0),
    CONSTRAINT otp_expiry_valid
        CHECK (expires_at > created_at),
    CONSTRAINT otp_consumed_invalidated_exclusive
        CHECK (NOT (consumed_at IS NOT NULL AND invalidated_at IS NOT NULL))
);

CREATE INDEX idx_otp_phone_recent
    ON otp_challenges (phone_e164, created_at DESC);

CREATE INDEX idx_otp_active_lookup
    ON otp_challenges (phone_e164, purpose, expires_at)
    WHERE consumed_at IS NULL AND invalidated_at IS NULL;


-- ============================================================
-- 6. AUTH ATTEMPTS / RATE-LIMIT EVENTS
-- ============================================================
-- Durable authentication event stream used by server-side rate limiting,
-- abuse detection and security review.
-- ============================================================

CREATE TABLE auth_attempts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_e164          VARCHAR(20),
    user_id             UUID
                        REFERENCES users(id)
                        ON UPDATE RESTRICT
                        ON DELETE SET NULL,
    event_type          VARCHAR(40) NOT NULL,
    result              VARCHAR(30) NOT NULL,
    ip_address          INET,
    user_agent          TEXT,
    challenge_id        UUID
                        REFERENCES otp_challenges(id)
                        ON UPDATE RESTRICT
                        ON DELETE SET NULL,
    failure_reason      VARCHAR(120),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT auth_attempt_phone_format
        CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
    CONSTRAINT auth_attempt_event_valid
        CHECK (event_type IN (
            'OTP_REQUEST',
            'OTP_VERIFY',
            'SESSION_CREATE',
            'SESSION_REFRESH',
            'LOGOUT',
            'PHONE_CHANGE',
            'ACCESS_DENIED'
        )),
    CONSTRAINT auth_attempt_result_valid
        CHECK (result IN ('SUCCESS', 'FAILURE', 'BLOCKED', 'EXPIRED'))
);

CREATE INDEX idx_auth_attempts_phone_time
    ON auth_attempts (phone_e164, created_at DESC)
    WHERE phone_e164 IS NOT NULL;

CREATE INDEX idx_auth_attempts_ip_time
    ON auth_attempts (ip_address, created_at DESC)
    WHERE ip_address IS NOT NULL;

CREATE INDEX idx_auth_attempts_user_time
    ON auth_attempts (user_id, created_at DESC)
    WHERE user_id IS NOT NULL;


-- ============================================================
-- 7. AUTH SESSIONS
-- ============================================================
-- Store only a hash/fingerprint of refresh/session secrets.
-- Never store reusable bearer tokens in plaintext.
-- ============================================================

CREATE TABLE auth_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL
                        REFERENCES users(id)
                        ON UPDATE RESTRICT
                        ON DELETE CASCADE,
    refresh_token_hash  TEXT NOT NULL,
    session_family_id   UUID NOT NULL DEFAULT gen_random_uuid(),
    created_ip          INET,
    last_ip             INET,
    user_agent          TEXT,
    device_label        VARCHAR(120),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at          TIMESTAMPTZ NOT NULL,
    revoked_at          TIMESTAMPTZ,
    revoke_reason       VARCHAR(120),
    replaced_by_session_id UUID,

    CONSTRAINT auth_sessions_expiry_valid
        CHECK (expires_at > created_at),
    CONSTRAINT auth_sessions_revocation_valid
        CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

ALTER TABLE auth_sessions
ADD CONSTRAINT fk_auth_sessions_replaced_by
FOREIGN KEY (replaced_by_session_id)
REFERENCES auth_sessions(id)
ON UPDATE RESTRICT
ON DELETE SET NULL;

CREATE UNIQUE INDEX uq_auth_sessions_refresh_hash
    ON auth_sessions (refresh_token_hash);

CREATE INDEX idx_auth_sessions_user_active
    ON auth_sessions (user_id, expires_at DESC)
    WHERE revoked_at IS NULL;

CREATE INDEX idx_auth_sessions_family
    ON auth_sessions (session_family_id, created_at);


-- ============================================================
-- 8. SECURITY EVENTS
-- ============================================================

CREATE TABLE security_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID
                        REFERENCES users(id)
                        ON UPDATE RESTRICT
                        ON DELETE SET NULL,
    event_type          VARCHAR(80) NOT NULL,
    severity            VARCHAR(20) NOT NULL DEFAULT 'INFO',
    ip_address          INET,
    user_agent          TEXT,
    entity_type         VARCHAR(80),
    entity_id           UUID,
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT security_event_type_not_blank
        CHECK (btrim(event_type) <> ''),
    CONSTRAINT security_event_severity_valid
        CHECK (severity IN ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT security_event_metadata_object
        CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_security_events_user_time
    ON security_events (user_id, created_at DESC)
    WHERE user_id IS NOT NULL;

CREATE INDEX idx_security_events_type_time
    ON security_events (event_type, created_at DESC);

CREATE INDEX idx_security_events_severity_time
    ON security_events (severity, created_at DESC);


-- ============================================================
-- 9. INITIAL SYSTEM ROLES
-- ============================================================

INSERT INTO roles (code, name, description, is_system)
VALUES
    ('CUSTOMER', 'Customer', 'Customer marketplace role', TRUE),
    ('PROVIDER', 'Provider', 'Individual or business provider role', TRUE),
    ('ADMIN', 'Administrator', 'Administrative role; actual authority is permission-based', TRUE)
ON CONFLICT (code) DO NOTHING;


-- ============================================================
-- 10. INITIAL PERMISSION CATALOGUE
-- ============================================================
-- This is intentionally a minimal foundation. More permissions are added
-- with each domain migration rather than granting broad wildcard access.
-- ============================================================

INSERT INTO permissions (code, name, resource, action, description)
VALUES
    ('customer.profile.read_own', 'Read Own Customer Profile', 'customer_profile', 'read_own', 'Read own customer profile'),
    ('customer.profile.update_own', 'Update Own Customer Profile', 'customer_profile', 'update_own', 'Update own customer profile'),
    ('provider.profile.read_own', 'Read Own Provider Profile', 'provider_profile', 'read_own', 'Read own provider profile'),
    ('provider.profile.update_own', 'Update Own Provider Profile', 'provider_profile', 'update_own', 'Update own provider-managed provider fields'),
    ('admin.providers.review', 'Review Providers', 'provider', 'review', 'Review provider onboarding and verification state'),
    ('admin.users.read', 'Read Users', 'user', 'read', 'Read user records according to admin policy'),
    ('admin.roles.manage', 'Manage Roles', 'role', 'manage', 'Assign and manage authorized roles'),
    ('admin.security.read', 'Read Security Events', 'security_event', 'read', 'Review authentication and security events')
ON CONFLICT (code) DO NOTHING;


-- ============================================================
-- 11. DEFAULT ROLE PERMISSION GRANTS
-- ============================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'customer.profile.read_own',
    'customer.profile.update_own'
)
WHERE r.code = 'CUSTOMER'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'provider.profile.read_own',
    'provider.profile.update_own'
)
WHERE r.code = 'PROVIDER'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'admin.providers.review',
    'admin.users.read',
    'admin.roles.manage',
    'admin.security.read'
)
WHERE r.code = 'ADMIN'
ON CONFLICT DO NOTHING;


-- ============================================================
-- 12. AUTHENTICATION / RBAC INVARIANTS
-- ============================================================
-- Application/server rules that MUST be implemented with this schema:
--
-- 1. Phone numbers are normalized to E.164 before lookup/storage.
-- 2. OTP raw values are never persisted or logged.
-- 3. OTP verification must atomically increment attempt_count and consume
--    a challenge only once.
-- 4. OTP requests and verifications are rate-limited by phone + IP and,
--    where useful, device/session context.
-- 5. Session refresh rotates refresh credentials and may revoke an entire
--    session_family_id on replay detection.
-- 6. account_status='SUSPENDED'/'BLOCKED' prevents protected sessions/actions.
-- 7. RBAC is always evaluated server-side.
-- 8. Ownership checks are required in addition to role/permission checks.
-- 9. Admin permission changes must create security/audit events.
-- 10. No client-provided role or permission claim is authoritative.
-- ============================================================

COMMIT;
