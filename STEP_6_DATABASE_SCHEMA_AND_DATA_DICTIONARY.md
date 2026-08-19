# iFixIt — Step 6: Database Schema & Data Dictionary

**Document Type:** Logical Database Design  
**Status:** Draft for approval  
**Version:** 1.0  
**Date:** 2026-08-19

---

## 1. Purpose

Defines the production logical data model derived from Steps 3–5. PostgreSQL is the target database. UUID primary keys are recommended unless a table is explicitly better served by a sequence/key.

Global conventions:
- `id UUID PRIMARY KEY`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` where mutable
- status values constrained by enum/check/reference table
- historical business records are not hard-deleted in ordinary flows
- public-facing ticket/reference numbers are separate from internal IDs
- monetary values use `NUMERIC(12,2)` or larger as required
- currency uses ISO-style code, default `MVR` for MVP

---

## 2. Core Identity Tables

### users
Purpose: authoritative application identity linked to authentication provider.

Fields:
- id UUID PK
- auth_subject VARCHAR UNIQUE NOT NULL
- verified_phone VARCHAR UNIQUE
- email VARCHAR
- account_status VARCHAR NOT NULL
- primary_role VARCHAR NOT NULL
- last_login_at TIMESTAMPTZ
- created_at
- updated_at

Indexes: verified_phone, email, account_status.

### user_roles
- id UUID PK
- user_id FK users
- role_code VARCHAR NOT NULL
- active BOOLEAN NOT NULL DEFAULT true
- granted_by UUID nullable FK users
- created_at

Unique: `(user_id, role_code)`.

### customer_profiles
- id UUID PK
- user_id UUID UNIQUE FK users
- full_name VARCHAR(150)
- default_location_id UUID nullable FK locations
- notification_preferences JSONB
- created_at
- updated_at

### provider_profiles
- id UUID PK
- user_id UUID UNIQUE FK users
- provider_type VARCHAR NOT NULL
- public_name VARCHAR(150) NOT NULL
- business_name VARCHAR(200)
- representative_name VARCHAR(150)
- description TEXT
- years_experience INT
- logo_media_id UUID nullable
- approval_status VARCHAR NOT NULL
- suspension_status VARCHAR NOT NULL DEFAULT 'ACTIVE'
- suspension_reason TEXT
- availability_status VARCHAR NOT NULL DEFAULT 'UNAVAILABLE'
- accepting_leads BOOLEAN NOT NULL DEFAULT false
- approved_at TIMESTAMPTZ
- suspended_at TIMESTAMPTZ
- created_at
- updated_at

Indexes: approval_status, suspension_status, accepting_leads.

---

## 3. Catalogue & Location

### service_categories
- id UUID PK
- code VARCHAR UNIQUE NOT NULL
- name VARCHAR NOT NULL
- description TEXT
- display_order INT DEFAULT 0
- status VARCHAR NOT NULL
- created_at
- updated_at

### service_subcategories
- id UUID PK
- category_id UUID FK service_categories
- code VARCHAR UNIQUE NOT NULL
- name VARCHAR NOT NULL
- description TEXT
- display_order INT DEFAULT 0
- status VARCHAR NOT NULL
- created_at
- updated_at

### repair_services
- id UUID PK
- subcategory_id UUID FK service_subcategories
- code VARCHAR UNIQUE NOT NULL
- name VARCHAR NOT NULL
- description TEXT
- requires_qualification BOOLEAN DEFAULT false
- display_order INT DEFAULT 0
- status VARCHAR NOT NULL
- created_at
- updated_at

### locations
- id UUID PK
- parent_id UUID nullable FK locations
- location_type VARCHAR NOT NULL
- code VARCHAR UNIQUE
- name VARCHAR NOT NULL
- marketplace_enabled BOOLEAN NOT NULL DEFAULT true
- status VARCHAR NOT NULL
- created_at
- updated_at

Indexes: parent_id, marketplace_enabled, status.

### provider_services
- id UUID PK
- provider_id UUID FK provider_profiles
- service_id UUID FK repair_services
- pricing_type VARCHAR NOT NULL
- base_amount NUMERIC(12,2)
- currency_code CHAR(3) DEFAULT 'MVR'
- active BOOLEAN DEFAULT true
- created_at
- updated_at

Unique: `(provider_id, service_id)`.

### provider_service_areas
- id UUID PK
- provider_id UUID FK provider_profiles
- location_id UUID FK locations
- active BOOLEAN DEFAULT true
- created_at

Unique: `(provider_id, location_id)`.

### provider_availability_windows
- id UUID PK
- provider_id UUID FK provider_profiles
- start_at TIMESTAMPTZ
- end_at TIMESTAMPTZ
- availability_type VARCHAR
- active BOOLEAN DEFAULT true
- created_at
- updated_at

---

## 4. Verification

### provider_verifications
- id UUID PK
- provider_id UUID FK provider_profiles
- verification_type VARCHAR NOT NULL
- status VARCHAR NOT NULL
- submitted_at TIMESTAMPTZ
- reviewed_at TIMESTAMPTZ
- reviewed_by UUID nullable FK users
- rejection_reason TEXT
- information_request TEXT
- expires_at TIMESTAMPTZ
- created_at
- updated_at

### verification_documents
- id UUID PK
- verification_id UUID FK provider_verifications
- media_id UUID FK media_objects
- document_type VARCHAR
- issuer VARCHAR
- issue_date DATE
- expiry_date DATE
- created_at

---

## 5. Media

### media_objects
- id UUID PK
- owner_user_id UUID nullable FK users
- storage_provider VARCHAR NOT NULL
- storage_key TEXT UNIQUE NOT NULL
- original_filename TEXT
- mime_type VARCHAR
- size_bytes BIGINT
- visibility VARCHAR NOT NULL
- checksum VARCHAR
- created_at

### entity_media_links
- id UUID PK
- media_id UUID FK media_objects
- entity_type VARCHAR NOT NULL
- entity_id UUID NOT NULL
- media_purpose VARCHAR NOT NULL
- customer_visible BOOLEAN DEFAULT true
- created_at

Index: `(entity_type, entity_id)`.

---

## 6. Repair Requests

### repair_requests
- id UUID PK
- ticket_no VARCHAR UNIQUE NOT NULL
- customer_id UUID FK customer_profiles
- service_id UUID FK repair_services
- item_type VARCHAR NOT NULL
- brand VARCHAR
- model VARCHAR
- serial_number VARCHAR
- problem_description TEXT NOT NULL
- location_id UUID FK locations
- address_text TEXT
- access_notes TEXT
- urgency VARCHAR NOT NULL
- preferred_start_at TIMESTAMPTZ
- preferred_end_at TIMESTAMPTZ
- status VARCHAR NOT NULL
- submitted_at TIMESTAMPTZ
- cancelled_at TIMESTAMPTZ
- cancellation_reason TEXT
- version_no INT NOT NULL DEFAULT 1
- created_at
- updated_at

Indexes: ticket_no, customer_id, service_id, location_id, status, created_at.

### repair_request_status_history
- id UUID PK
- repair_request_id UUID FK repair_requests
- from_status VARCHAR
- to_status VARCHAR NOT NULL
- changed_by UUID nullable FK users
- reason TEXT
- metadata JSONB
- created_at

Index: `(repair_request_id, created_at)`.

---

## 7. Matching, Leads & Assignments

### repair_leads
- id UUID PK
- repair_request_id UUID FK repair_requests
- provider_id UUID FK provider_profiles
- rank_score NUMERIC(12,4)
- status VARCHAR NOT NULL
- sent_at TIMESTAMPTZ
- viewed_at TIMESTAMPTZ
- responded_at TIMESTAMPTZ
- expires_at TIMESTAMPTZ
- decline_reason TEXT
- created_at
- updated_at

Unique recommended: prevent duplicate active lead per request/provider.

### repair_assignments
- id UUID PK
- repair_request_id UUID FK repair_requests
- provider_id UUID FK provider_profiles
- source VARCHAR NOT NULL
- status VARCHAR NOT NULL
- assigned_by UUID nullable FK users
- assigned_at TIMESTAMPTZ NOT NULL
- accepted_at TIMESTAMPTZ
- ended_at TIMESTAMPTZ
- end_reason TEXT
- created_at
- updated_at

Constraint: at most one active exclusive assignment per request when configured.

### assignment_history
- id UUID PK
- assignment_id UUID FK repair_assignments
- action VARCHAR NOT NULL
- actor_user_id UUID nullable FK users
- reason TEXT
- metadata JSONB
- created_at

---

## 8. Jobs & Inspections

### repair_jobs
- id UUID PK
- job_no VARCHAR UNIQUE NOT NULL
- repair_request_id UUID UNIQUE FK repair_requests
- customer_id UUID FK customer_profiles
- provider_id UUID FK provider_profiles
- service_id UUID FK repair_services
- location_id UUID FK locations
- status VARCHAR NOT NULL
- started_at TIMESTAMPTZ
- repair_completed_at TIMESTAMPTZ
- customer_confirmed_at TIMESTAMPTZ
- finalized_at TIMESTAMPTZ
- cancelled_at TIMESTAMPTZ
- cancellation_reason TEXT
- version_no INT DEFAULT 1
- created_at
- updated_at

Indexes: provider_id, customer_id, status, created_at.

### job_status_history
- id UUID PK
- job_id UUID FK repair_jobs
- from_status VARCHAR
- to_status VARCHAR NOT NULL
- changed_by UUID nullable FK users
- reason TEXT
- metadata JSONB
- created_at

### inspections
- id UUID PK
- job_id UUID FK repair_jobs
- status VARCHAR NOT NULL
- scheduled_at TIMESTAMPTZ
- started_at TIMESTAMPTZ
- completed_at TIMESTAMPTZ
- diagnosis_summary TEXT
- fault_identified TEXT
- recommended_repair TEXT
- estimated_labour_amount NUMERIC(12,2)
- estimated_duration_minutes INT
- customer_notes TEXT
- internal_notes TEXT
- created_at
- updated_at

### repair_progress_events
- id UUID PK
- job_id UUID FK repair_jobs
- event_type VARCHAR NOT NULL
- note TEXT
- customer_visible BOOLEAN DEFAULT true
- created_by UUID FK users
- created_at

---

## 9. Quotations

### quotations
- id UUID PK
- job_id UUID FK repair_jobs
- current_version_no INT NOT NULL DEFAULT 1
- status VARCHAR NOT NULL
- currency_code CHAR(3) DEFAULT 'MVR'
- subtotal NUMERIC(12,2) NOT NULL DEFAULT 0
- fees NUMERIC(12,2) NOT NULL DEFAULT 0
- discount NUMERIC(12,2) NOT NULL DEFAULT 0
- tax NUMERIC(12,2) NOT NULL DEFAULT 0
- total NUMERIC(12,2) NOT NULL DEFAULT 0
- estimated_duration_minutes INT
- expires_at TIMESTAMPTZ
- submitted_at TIMESTAMPTZ
- viewed_at TIMESTAMPTZ
- approved_at TIMESTAMPTZ
- rejected_at TIMESTAMPTZ
- created_at
- updated_at

### quotation_versions
- id UUID PK
- quotation_id UUID FK quotations
- version_no INT NOT NULL
- status VARCHAR NOT NULL
- notes TEXT
- subtotal NUMERIC(12,2)
- fees NUMERIC(12,2)
- discount NUMERIC(12,2)
- tax NUMERIC(12,2)
- total NUMERIC(12,2)
- estimated_duration_minutes INT
- expires_at TIMESTAMPTZ
- created_by UUID FK users
- created_at

Unique: `(quotation_id, version_no)`.

### quotation_items
- id UUID PK
- quotation_version_id UUID FK quotation_versions
- item_type VARCHAR NOT NULL
- description TEXT NOT NULL
- part_number VARCHAR
- quantity NUMERIC(12,3) NOT NULL DEFAULT 1
- unit_price NUMERIC(12,2) NOT NULL DEFAULT 0
- line_total NUMERIC(12,2) NOT NULL
- display_order INT DEFAULT 0
- created_at

---

## 10. Parts & Labour

### job_parts
- id UUID PK
- job_id UUID FK repair_jobs
- part_name VARCHAR NOT NULL
- part_number VARCHAR
- brand VARCHAR
- quantity NUMERIC(12,3) NOT NULL
- unit_price NUMERIC(12,2) NOT NULL
- supplier_reference VARCHAR
- installed_at TIMESTAMPTZ
- warranty_duration_days INT
- warranty_terms TEXT
- created_by UUID FK users
- created_at
- updated_at

### job_labour
- id UUID PK
- job_id UUID FK repair_jobs
- description TEXT NOT NULL
- hours NUMERIC(8,2)
- rate NUMERIC(12,2)
- amount NUMERIC(12,2) NOT NULL
- created_by UUID FK users
- created_at
- updated_at

---

## 11. Warranty & Claims

### warranties
- id UUID PK
- job_id UUID FK repair_jobs
- provider_id UUID FK provider_profiles
- customer_id UUID FK customer_profiles
- warranty_type VARCHAR NOT NULL
- start_date DATE NOT NULL
- end_date DATE
- covered_repair TEXT
- covered_parts TEXT
- terms TEXT
- status VARCHAR NOT NULL
- created_at
- updated_at

### warranty_claims
- id UUID PK
- warranty_id UUID FK warranties
- customer_id UUID FK customer_profiles
- status VARCHAR NOT NULL
- issue_description TEXT NOT NULL
- resolution TEXT
- submitted_at TIMESTAMPTZ
- resolved_at TIMESTAMPTZ
- resolved_by UUID nullable FK users
- created_at
- updated_at

### warranty_claim_history
- id UUID PK
- warranty_claim_id UUID FK warranty_claims
- from_status VARCHAR
- to_status VARCHAR NOT NULL
- actor_user_id UUID nullable FK users
- reason TEXT
- created_at

---

## 12. Reviews

### reviews
- id UUID PK
- job_id UUID UNIQUE FK repair_jobs
- customer_id UUID FK customer_profiles
- provider_id UUID FK provider_profiles
- quality SMALLINT NOT NULL
- punctuality SMALLINT NOT NULL
- communication SMALLINT NOT NULL
- professionalism SMALLINT NOT NULL
- value_for_money SMALLINT NOT NULL
- feedback TEXT
- moderation_status VARCHAR NOT NULL DEFAULT 'PUBLISHED'
- created_at
- updated_at

Checks: ratings 1–5.

### review_moderation_history
- id UUID PK
- review_id UUID FK reviews
- action VARCHAR NOT NULL
- reason TEXT NOT NULL
- actor_user_id UUID FK users
- created_at

---

## 13. Complaints & Disputes

### complaints
- id UUID PK
- complaint_no VARCHAR UNIQUE NOT NULL
- opened_by_user_id UUID FK users
- against_user_id UUID nullable FK users
- repair_request_id UUID nullable FK repair_requests
- job_id UUID nullable FK repair_jobs
- category VARCHAR NOT NULL
- description TEXT NOT NULL
- status VARCHAR NOT NULL
- assigned_admin_id UUID nullable FK users
- resolution TEXT
- resolved_at TIMESTAMPTZ
- created_at
- updated_at

### complaint_status_history
- id UUID PK
- complaint_id UUID FK complaints
- from_status VARCHAR
- to_status VARCHAR NOT NULL
- actor_user_id UUID nullable FK users
- reason TEXT
- created_at

---

## 14. Subscriptions & Payments

### subscription_plans
- id UUID PK
- code VARCHAR UNIQUE NOT NULL
- name VARCHAR NOT NULL
- description TEXT
- price NUMERIC(12,2) NOT NULL
- currency_code CHAR(3) DEFAULT 'MVR'
- duration_months INT NOT NULL
- grace_days INT DEFAULT 0
- active BOOLEAN DEFAULT true
- features JSONB
- created_at
- updated_at

### provider_subscriptions
- id UUID PK
- provider_id UUID FK provider_profiles
- plan_id UUID FK subscription_plans
- status VARCHAR NOT NULL
- starts_at TIMESTAMPTZ
- ends_at TIMESTAMPTZ
- grace_ends_at TIMESTAMPTZ
- source_payment_id UUID nullable
- created_at
- updated_at

Indexes: provider_id, status, ends_at.

### payments
- id UUID PK
- provider_id UUID nullable FK provider_profiles
- customer_id UUID nullable FK customer_profiles
- purpose VARCHAR NOT NULL
- external_reference VARCHAR
- amount NUMERIC(12,2) NOT NULL
- currency_code CHAR(3) NOT NULL
- status VARCHAR NOT NULL
- initiated_at TIMESTAMPTZ
- succeeded_at TIMESTAMPTZ
- failed_at TIMESTAMPTZ
- refunded_at TIMESTAMPTZ
- gateway_name VARCHAR
- gateway_transaction_id VARCHAR
- metadata JSONB
- created_at
- updated_at

Unique as appropriate on `(gateway_name, gateway_transaction_id)`.

### payment_events
- id UUID PK
- payment_id UUID nullable FK payments
- gateway_name VARCHAR NOT NULL
- external_event_id VARCHAR NOT NULL
- event_type VARCHAR NOT NULL
- signature_valid BOOLEAN
- payload_hash VARCHAR
- processed_at TIMESTAMPTZ
- processing_status VARCHAR
- created_at

Unique: `(gateway_name, external_event_id)`.

---

## 15. Notifications

### notifications
- id UUID PK
- user_id UUID FK users
- event_type VARCHAR NOT NULL
- title VARCHAR
- body TEXT
- channel VARCHAR NOT NULL
- status VARCHAR NOT NULL
- related_entity_type VARCHAR
- related_entity_id UUID
- created_at
- read_at TIMESTAMPTZ

### notification_attempts
- id UUID PK
- notification_id UUID FK notifications
- attempt_no INT NOT NULL
- provider_name VARCHAR
- status VARCHAR NOT NULL
- response_code VARCHAR
- error_message TEXT
- attempted_at TIMESTAMPTZ NOT NULL

---

## 16. Admin, Audit & Configuration

### audit_events
- id UUID PK
- actor_user_id UUID nullable FK users
- action_code VARCHAR NOT NULL
- entity_type VARCHAR NOT NULL
- entity_id UUID
- previous_value JSONB
- new_value JSONB
- reason TEXT
- correlation_id VARCHAR
- ip_address INET
- user_agent TEXT
- created_at

Indexes: actor_user_id, entity_type/entity_id, created_at.

### system_settings
- id UUID PK
- setting_key VARCHAR UNIQUE NOT NULL
- setting_value JSONB NOT NULL
- sensitive BOOLEAN DEFAULT false
- updated_by UUID nullable FK users
- updated_at TIMESTAMPTZ

### feature_flags
- id UUID PK
- flag_key VARCHAR UNIQUE NOT NULL
- enabled BOOLEAN NOT NULL DEFAULT false
- configuration JSONB
- updated_by UUID nullable FK users
- updated_at TIMESTAMPTZ

---

## 17. Key Database Constraints

1. One verified review per job.
2. One provider-service relation per provider/service.
3. One provider-area relation per provider/location.
4. Quote version numbers unique within quotation.
5. External payment event IDs unique per gateway.
6. Ticket/job/complaint public references unique.
7. Rating fields constrained to 1–5.
8. Quantity/amount fields cannot be negative except explicit discount model.
9. State transition validity enforced in service layer and, where appropriate, database constraints/triggers.
10. Historical rows referenced by completed business processes must not be deleted.

---

## 18. Index Strategy

High-priority indexes:
- repair requests by `status, location_id, service_id, created_at`
- providers by eligibility-related status
- provider services by `service_id, provider_id, active`
- provider areas by `location_id, provider_id, active`
- leads by `provider_id, status, expires_at`
- jobs by `provider_id, status` and `customer_id, created_at`
- quotations by `job_id, status`
- complaints by `status, assigned_admin_id`
- subscriptions by `provider_id, status, ends_at`
- payments by `status, created_at, gateway_transaction_id`
- audit events by `entity_type, entity_id, created_at`

---

## 19. Retention & Deletion Rules

- Authentication/security logs: retention policy configurable.
- Verification documents: private retention per legal/business policy.
- Repair, quote, payment, complaint, warranty, review and audit history: preserve according to platform retention policy.
- User account deletion request should anonymize/remove personal data where legally required without corrupting transactional history.
- Master data referenced historically is archived/disabled, not hard deleted.

---

## 20. Step 6 Approval Gate

- [ ] Every Step 3/5 functional entity represented
- [ ] Tables/fields approved
- [ ] Relationships approved
- [ ] Status/history model approved
- [ ] Quote versioning approved
- [ ] Payment idempotency model approved
- [ ] Index strategy approved
- [ ] Privacy/retention approved
- [ ] Database migration strategy approved

After approval, proceed to Step 7 API Contracts.
