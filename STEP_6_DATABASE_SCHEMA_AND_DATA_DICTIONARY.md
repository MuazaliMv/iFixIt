# iFixIt — Step 6: Database Schema & Data Dictionary

**Document Type:** Current Logical Database Design  
**Status:** Synchronized Implementation Baseline  
**Version:** 2.0  
**Date:** 2026-08-19

---

## 1. Authority and Purpose

This document is the synchronized logical data dictionary for iFixIt.

For capabilities already implemented, the committed PostgreSQL migrations are authoritative. This document summarizes those migrations and the approved forward model. It must not be used to reintroduce older generic entities that conflict with the committed schema.

Authoritative precedence:

1. committed migrations for implemented structures
2. `MVP_BUSINESS_MODEL_AND_SCOPE_FREEZE.md` for MVP business rules
3. `LOCAL_ISLAND_MATCHING_AND_LOCATION_ARCHITECTURE.md` for Maldives geography and matching
4. `docs/architecture/DATA_MODEL_STANDARD.md` for modeling conventions
5. this synchronized Step 6 document for logical/data-dictionary guidance
6. older specification examples only where they do not conflict with the above

PostgreSQL is the authoritative transactional data store.

Global conventions:

- UUID primary keys for domain/transaction records
- `TIMESTAMPTZ` for event timestamps
- `NUMERIC` for money; MVR is the default MVP currency
- foreign keys for authoritative relationships
- `CHECK`/unique constraints for important invariants
- append-oriented history for important business changes
- JSONB only for metadata/snapshots/integration payloads, not core relationships
- canonical atoll/island IDs; free-text island names are never matching keys
- customer repair-payment acknowledgement is separate from provider subscription payment transactions

---

## 2. Implemented Migration Map

| Migration | Implemented domain |
|---|---|
| `0001_core_domain.sql` | canonical geography, users, provider profiles, repair requests |
| `0002_auth_rbac.sql` | roles, permissions, OTP/auth/session/security events |
| `0003_location_catalogue.sql` | island aliases and service catalogue |
| `0004_provider_onboarding_service_areas_availability.sql` | provider services, pricing, service areas, availability, verification metadata |
| `0005_search_tier_matching_engine.sql` | matching metrics, attempts, candidates, leads, assignments, direct fallback, atomic acceptance |
| `0006_repair_jobs_lifecycle.sql` | repair jobs, scheduling/history, job status history, progress events and job lifecycle |

Planned extensions:

`0007 Inspection / Versioned Quotation / Completion → 0008 Off-Platform Payment Acknowledgement → 0009 Reviews / Complaints / Notifications → 0010 Subscriptions / Promotions → 0011 Admin / Reporting → 0012 Security / Performance Hardening`

---

## 3. Identity & Access — Implemented

### `users`

Authoritative application user identity.

Key fields include:

- `id`
- `phone_e164`
- phone verification state
- optional email
- full name
- account status
- default island reference where configured
- last login timestamps
- created/updated timestamps

There is **no authoritative `primary_role` field**. Roles are normalized through RBAC.

### `roles`

Defines roles such as Customer, Provider and Admin.

### `permissions`

Granular permission catalogue.

### `role_permissions`

Many-to-many mapping between roles and permissions.

### `user_roles`

Many-to-many mapping between users and roles. One user may hold more than one allowed role.

### Authentication/security entities

Implemented entities include:

- `otp_challenges`
- `auth_attempts`
- `auth_sessions`
- `security_events`

OTP values must not be stored/logged in plaintext. Sessions must support expiry/revocation and replay-safe refresh-token handling.

### Customer profile rule

A separate `customer_profiles` table is **not currently authoritative**. Customer identity is represented by `users`, with customer-specific entities linked by `customer_id` to `users.id`. A future customer-preferences/address table may be added if needed without changing identity authority.

---

## 4. Maldives Geography — Implemented

### `atolls`

Canonical atoll master.

Important characteristics:

- immutable UUID ID
- canonical code/name/display name
- active/serviceable flags
- sort/order metadata

### `islands`

Canonical island master linked to `atolls`.

Important characteristics:

- immutable UUID ID
- canonical name/display name
- atoll FK
- active/serviceable/inhabited attributes
- optional coordinates
- composite `(id, atoll_id)` integrity for downstream references

### `island_aliases`

Alternative spellings/search helpers only.

**Rule:** aliases/free text must never determine provider eligibility or matching tier.

### Deprecated logical concept

The previous generic hierarchical `locations` table is superseded for Maldives marketplace matching by canonical `atolls` + `islands`.

---

## 5. Service Catalogue — Implemented

### `service_categories`

Top-level service category.

### `service_subcategories`

Subcategory linked to category.

### `repair_services`

Exact service linked to a subcategory.

Important attributes include service activation and workflow classification.

Authoritative workflow types:

- `FIXED_PRICE`
- `DIAGNOSIS_REQUIRED`

Normal catalogue additions must be data-driven and should not require application code changes.

---

## 6. Provider Domain — Implemented

### `provider_profiles`

One provider profile per provider user.

Key data includes:

- provider/account type
- public/business name
- description/experience/profile details
- preferred contact data
- legal/registered atoll and island
- operational-base atoll and island
- approval status
- verification status
- marketplace status
- availability status
- accepting-leads flag
- suspension state

**Critical rule:** legal registration location is separate from operational base and approved service areas.

### `provider_services`

Exact services a provider is eligible to perform.

Typical state values include active/inactive/pending verification/rejected.

### `provider_service_pricing`

Service-specific provider pricing.

Supported presentation models:

- `FIXED`
- `STARTING_FROM`
- `HOURLY`
- `INSPECTION_REQUIRED`
- `QUOTE_REQUIRED`

May include base/minimum amount, unit, travel/overtime/weekend/holiday charges and duration estimates.

### `provider_service_areas`

Explicit additional islands a provider is approved/willing to serve.

This table does not replace the operational base. The provider's own operational-base island is Tier 0; explicit target-island service area is Tier 1.

### Availability

Implemented availability entities:

- `provider_weekly_availability`
- `provider_availability_overrides`

Canonical availability statuses include:

- `AVAILABLE_NOW`
- `AVAILABLE_TODAY`
- `BY_APPOINTMENT`
- `UNAVAILABLE`

The older generic `provider_availability_windows` concept is superseded by this weekly + override model.

### Verification

Implemented verification/document metadata includes `provider_verification_documents` plus provider verification state/history.

Verification file content must be stored privately through a controlled object-storage integration; database rows store metadata/object keys, not public file URLs.

### `provider_status_history`

Append-oriented provider status/approval/verification/suspension history.

---

## 7. Repair Request Domain — Implemented

### `repair_requests`

Represents customer demand before/through matching and assignment.

Important fields include:

- `ticket_number`
- `customer_id` → `users`
- `booking_model`
- `requested_provider_id` for Direct Booking
- `workflow_type`
- exact `service_id`
- canonical `service_atoll_id`
- canonical `service_island_id`
- address/building/floor/landmark
- optional latitude/longitude
- problem/equipment/brand/model/serial data
- urgency
- preferred date/time window
- `matching_scope`
- cross-atoll consent timestamp/source
- status
- known price/currency when applicable
- submission/cancellation timestamps

Booking models:

- `DIRECT_PROVIDER`
- `SMART_MATCHING`

Matching scopes:

- `LOCAL_ONLY`
- `TARGET_ISLAND_SERVICE_AREA_ALLOWED`
- `SAME_ATOLL_ALLOWED`
- `CROSS_ATOLL_ALLOWED`

Cross-atoll scope requires explicit recorded consent/source.

### Repair request vs job

`repair_requests` represent demand. They must not be collapsed with provider leads, assignment history or accepted operational jobs.

---

## 8. Matching & Assignment — Implemented

### `provider_matching_metrics`

Operational ranking snapshot. Includes rating/acceptance/completion/response/workload metrics and a temporary `subscription_eligible` integration gate.

Migration 0010 will bind subscription eligibility to authoritative subscription state.

### `matching_attempts`

Audits every matching stage/attempt including mode, geographic tier, service, target atoll/island, algorithm version, outcome and counts.

### `matching_candidates`

Candidate snapshot per matching attempt.

Separates hard eligibility from ranking scores.

### `repair_leads`

Provider offers/leads.

Canonical states include:

- `NEW`
- `VIEWED`
- `ACCEPTED`
- `DECLINED`
- `EXPIRED`
- `CANCELLED`
- `LOST_RACE`

### `repair_assignments`

Historical assignment records.

A unique partial constraint guarantees at most one active exclusive assignment per request.

### `direct_booking_fallback_decisions`

Records explicit customer choice after Direct Booking decline/expiry/ineligibility.

Direct Booking must never silently broaden to Smart Matching.

### Matching geographic tiers

- Tier 0: operational base = target island
- Tier 1: explicit target-island service area
- Tier 2: same-atoll expansion only when scope permits
- Tier 3: cross-atoll only with explicit authorization/consent

---

## 9. Repair Job Domain — Implemented

### `repair_jobs`

Represents accepted operational work.

Relationship chain:

`repair_request → repair_assignment → repair_job`

Important fields include:

- `job_number`
- unique `repair_request_id`
- `current_assignment_id`
- `provider_id`
- `customer_id` → `users`
- `service_id`
- `workflow_type`
- detailed job status
- scheduled start/end
- actual start
- repair completion/customer confirmation/finalization/cancellation timestamps
- provider completion note/internal note
- final recorded amount/currency

One logical repair job exists per repair request; provider reassignment remains represented by assignment history and current assignment linkage.

### Canonical implemented job statuses

- `ACCEPTED`
- `SCHEDULED`
- `INSPECTION_SCHEDULED`
- `INSPECTED`
- `QUOTE_PENDING`
- `QUOTE_APPROVED`
- `REPAIR_SCHEDULED`
- `IN_PROGRESS`
- `WAITING_FOR_PARTS`
- `ON_HOLD`
- `REPAIR_COMPLETED`
- `CUSTOMER_CONFIRMATION`
- `DISPUTED`
- `FINALIZED`
- `CANCELLED`
- `UNABLE_TO_REPAIR`

### `repair_job_status_history`

Append-oriented status history.

### `repair_job_schedule_history`

Append-oriented schedule history for service/inspection/repair/follow-up scheduling. `repair_jobs` keeps the current operational schedule for efficient reads.

### `repair_job_progress_events`

Customer-visible/private timeline events.

### Workflow integrity rule for Migration 0007

Migration 0006 provides the generic job state machine. Migration 0007 must add workflow-specific guards so a `DIAGNOSIS_REQUIRED` job cannot start repair until the required inspection/diagnosis and the **current quotation version** has been approved by the customer.

This is a mandatory integrity rule, not an optional UI behavior.

---

## 10. Inspection & Versioned Quotation — Planned Migration 0007

### `inspections`

Planned fields include:

- job FK
- status
- schedule/start/completion timestamps
- diagnosis/fault/recommended-repair data
- estimated labour/duration
- customer-visible and internal notes

### `quotations`

Represents the logical quotation for a job and current state/version pointer.

### `quotation_versions`

Immutable/versioned commercial proposals.

Each revision creates a new version. Approval of version N does not approve version N+1.

### `quotation_items`

Version-specific line items such as labour, parts and authorized fees.

### Mandatory quotation invariants

- server recalculates totals
- submitted versions are preserved
- only current unexpired submitted version can be approved
- customer ownership is validated
- material change creates a new version
- `DIAGNOSIS_REQUIRED` repair cannot proceed without approval of the current version

### Completion evidence

Migration 0007 also extends structured completion evidence where required.

---

## 11. Parts & Labour — Planned with Job/Quotation Extensions

Logical entities may include:

### `job_parts`

Part name/number/brand, quantity, unit price, supplier reference, installation date and warranty details.

### `job_labour`

Description, hours/rate where applicable and amount.

Finalized records must remain historically auditable.

---

## 12. Off-Platform Repair Payment Acknowledgement — Planned Migration 0008

Customer repair money is outside iFixIt MVP.

Planned repair-payment entities must represent **declarations/evidence**, not platform settlement.

Recommended domain entities:

### `provider_payment_methods`

Provider-configured accepted methods/instructions with protected visibility.

### `repair_payment_acknowledgements`

Records customer `I Have Paid` and provider `Payment Received` declarations, amount/method/timestamps/status where applicable.

### `repair_payment_evidence`

Private evidence metadata/links where enabled.

### `repair_payment_status_history`

Append-oriented status/declaration history.

### Prohibited interpretation

These records must not imply that iFixIt:

- held customer funds
- escrowed funds
- processed repair checkout
- split payment
- paid out the provider
- automatically refunded customer repair money

---

## 13. Reviews & Ratings — Planned Migration 0009

The synchronized MVP review model uses **four customer-visible rating dimensions**:

- Quality
- Punctuality
- Communication
- Value for Money

`overall_rating` is calculated from the four dimensions unless a later explicit product decision changes this rule.

`professionalism` is **not a new canonical rating dimension** for Migration 0009. Older documents showing it are historical and superseded by this synchronized model.

Only an eligible completed/finalized platform job may create a verified review, with one logical verified review per job.

Planned entities include:

- `reviews`
- review edit/version history where required
- `review_responses`
- `review_flags`
- moderation history

Provider aggregate ratings are derived/recalculable; a manually editable aggregate is not source of truth.

---

## 14. Complaints & Disputes — Planned Migration 0009

Planned complaint structures include:

- human-readable complaint number
- opened-by user
- related job/request/provider relationship
- category
- description
- priority
- requested resolution
- status
- assigned admin
- escalation metadata
- resolution
- private evidence links
- append-oriented status/timeline history

Requested refund/compensation is a requested outcome from the provider, not an automatic iFixIt refund action.

---

## 15. Notifications — Planned Migration 0009

Logical notification structures should separate the notification/event from delivery attempts.

Planned capabilities:

- in-app notification records
- read state
- user preferences
- delivery attempts/results
- adapters for SMS/email/WhatsApp/push where enabled

Notification failure must not roll back the authoritative business transaction that generated the notification.

---

## 16. Provider Subscription & Platform Payments — Planned Migration 0010

This is a separate financial domain from customer repair-payment acknowledgement.

Planned entities include:

### `subscription_plans`

Database-configured Starter/Professional/Business-style plans and entitlements.

### `provider_subscriptions`

Provider subscription lifecycle.

### `subscription_payments`

Platform-processed provider subscription transaction records.

### `subscription_payment_events`

Gateway/webhook events with signature/idempotency controls.

### Promotions

Planned campaign entities include promotion campaigns/stages/enrollments/price schedules and Founding Provider/early-adopter rules.

Migration 0010 must replace the temporary matching `subscription_eligible` authority with an authoritative subscription-derived eligibility calculation.

---

## 17. Warranty — Planned

Warranty is a post-completion service domain, not a payment guarantee.

Logical entities may include:

- `warranties`
- `warranty_claims`
- `warranty_claim_history`

Eligibility requires an eligible completed job and active applicable warranty terms.

---

## 18. Admin, Audit & Reporting — Planned Migration 0011

Audit structures must be append-oriented and protected from ordinary administrative deletion.

Audit event data should capture:

- actor
- action
- entity type/ID
- previous value
- new value
- reason
- correlation/request context
- timestamp

Reporting views/materialized views are derived read models and must not become competing sources of transactional truth.

---

## 19. Security/Performance Hardening — Planned Migration 0012 + Application Layer

Database/application hardening includes:

- least-privilege database access
- server-side RBAC/ownership checks
- idempotency for critical writes
- rate limiting at API/auth boundaries
- private object access through authorization/signed URLs
- index/query review
- backup/PITR verification
- audit retention
- concurrency testing
- OWASP-aligned application controls

---

## 20. Relationship Summary

```text
users
  ├─ user_roles ─ roles ─ role_permissions ─ permissions
  ├─ provider_profiles
  │    ├─ provider_services ─ provider_service_pricing
  │    ├─ provider_service_areas ─ islands ─ atolls
  │    ├─ provider_weekly_availability
  │    ├─ provider_availability_overrides
  │    └─ provider_verification_documents
  │
  └─ repair_requests
       ├─ matching_attempts ─ matching_candidates
       ├─ repair_leads
       ├─ repair_assignments
       └─ repair_jobs
            ├─ repair_job_status_history
            ├─ repair_job_schedule_history
            ├─ repair_job_progress_events
            ├─ inspections                         [0007]
            ├─ quotations ─ quotation_versions    [0007]
            ├─ repair payment acknowledgements    [0008]
            ├─ reviews / complaints                [0009]
            └─ warranties                          [planned]

provider_profiles
  └─ provider_subscriptions ─ subscription_payments [0010]
```

---

## 21. Non-Negotiable Data Rules

1. Canonical `atoll_id`/`island_id` relationships determine geographic eligibility; free text never does.
2. Provider legal registration location is separate from operational base/service areas.
3. Direct Booking cannot silently become Smart Matching.
4. Only one active exclusive assignment may exist per repair request.
5. `repair_request`, `repair_lead`, `repair_assignment` and `repair_job` are distinct entities.
6. `DIAGNOSIS_REQUIRED` work cannot bypass inspection/diagnosis and current quotation approval.
7. Submitted quotation versions are preserved; revision creates a new version.
8. Customer repair-payment acknowledgement is not platform payment verification/settlement.
9. Provider subscription payments are a separate financial domain.
10. Sensitive verification/payment/complaint media remains private.
11. Important status/administrative changes leave append-oriented history/audit.
12. Derived reporting/cache aggregates are never the source of transactional truth.

---

## 22. Synchronization Result

This Version 2.0 supersedes the older logical examples that used generic `locations`, `customer_profiles`, `primary_role`, `provider_availability_windows`, generic customer/provider `payments`, and the five-dimension review model.

Future schema work must extend the committed migration chain rather than copying superseded table definitions from Version 1.0.