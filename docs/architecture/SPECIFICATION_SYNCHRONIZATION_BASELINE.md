# iFixIt — Specification Synchronization Baseline

**Status:** Authoritative reconciliation record  
**Version:** 1.0  
**Date:** 2026-08-19

## 1. Purpose

This file records the repository-wide synchronization rules applied after migrations `0001`–`0006` were implemented.

The project evolved from pre-coding specifications into a committed PostgreSQL implementation. Some early Step documents therefore contain logical examples or names that no longer match the implemented schema. Those examples must not be treated as competing sources of truth.

## 2. Source-of-Truth Precedence

When two repository documents disagree, use this order:

1. **Committed migration chain** for structures/invariants already implemented.
2. **`MVP_BUSINESS_MODEL_AND_SCOPE_FREEZE.md`** for approved MVP business model/scope.
3. **`LOCAL_ISLAND_MATCHING_AND_LOCATION_ARCHITECTURE.md`** for Maldives geography/matching.
4. **`docs/architecture/DATA_MODEL_STANDARD.md`** for data-model conventions.
5. **`STEP_6_DATABASE_SCHEMA_AND_DATA_DICTIONARY.md` Version 2.0** for synchronized logical schema.
6. **`STEP_7_API_CONTRACTS.md` Version 2.0** and `docs/api/API_CATALOGUE.md` for API surface.
7. **`STEP_13_CUSTOMER_COMPLAINT_AND_RATING_SYSTEM.md` Version 2.0** for review/complaint details.
8. Later approved supplemental Steps for their own domains.
9. Older Step examples only where they do not conflict with a higher source.

## 3. Resolved Inconsistencies

### 3.1 Geography

**Resolved model:** canonical `atolls` + `islands` + `island_aliases`.

Superseded: generic hierarchical `locations` as the authoritative marketplace-matching key.

Rules:

- free-text/aliases are search helpers only
- `island_id` and `atoll_id` determine geographic eligibility
- provider legal registration is separate from operational base and approved service islands
- Tier 0 through Tier 3 matching rules remain authoritative
- cross-atoll expansion requires explicit authorization/consent

### 3.2 Customer identity

**Resolved model:** `users` is the customer identity authority for the implemented domain.

Superseded as current authority: old Step 6 `customer_profiles` assumptions.

A future customer preferences/saved-address table may be added without changing identity authority.

### 3.3 Roles

**Resolved model:** normalized RBAC (`roles`, `permissions`, `role_permissions`, `user_roles`).

Superseded: `users.primary_role` as an authoritative authorization field.

UI role display never replaces server-side authorization.

### 3.4 Provider availability

**Resolved model:** weekly availability + date-specific overrides + provider current availability status.

Superseded: generic `provider_availability_windows` as the primary model.

### 3.5 Provider geography

**Resolved model:**

- registered/legal location
- operational base
- explicit service-area islands

These are separate concepts and must never be collapsed.

### 3.6 Repair demand, leads, assignments and jobs

**Resolved model:**

`repair_request → matching attempt/candidates → repair_lead → repair_assignment → repair_job`

These are distinct entities.

One active exclusive assignment per request is enforced at the database level.

### 3.7 Direct Booking fallback

**Resolved rule:** Direct Booking never silently becomes Smart Matching or another provider assignment.

Customer fallback choice must be recorded.

### 3.8 Job lifecycle

Migration `0006` is authoritative for current job states, schedule history, job history and progress events.

Older logical `job_no`/generic job examples are superseded by the implemented `repair_jobs` model and `job_number` terminology.

### 3.9 DIAGNOSIS_REQUIRED integrity

**Resolved rule:** a diagnosis-required job cannot enter actual repair work until required inspection/diagnosis is complete and the current quotation version has customer approval.

Migration `0007` must introduce the workflow-specific database/service guard before exposing the full inspection/quotation workflow as complete.

Generic transitions in Migration `0006` are not permission to bypass this requirement.

### 3.10 Rating dimensions

**Resolved MVP model:** four dimensions:

1. Quality
2. Punctuality
3. Communication
4. Value for Money

Overall rating is calculated from these four by default.

The legacy `professionalism` fifth dimension is superseded for new MVP review records. Older documents mentioning it are historical on this point.

### 3.11 Repair payments vs platform payments

**Resolved financial separation:**

**Repair payment acknowledgement**
- customer pays provider off-platform
- customer may declare `I Have Paid`
- provider independently may declare `Payment Received`
- evidence/disagreement may be recorded
- iFixIt does not hold/escrow/split/payout/refund repair money

**Provider subscription payment**
- separate platform billing domain
- may use payment gateway/webhook processing
- implemented later in Migration `0010`

Any older generic `payments` example mixing customer repair settlement with subscription gateway transactions is superseded.

### 3.12 In-platform chat

Full live chat remains deferred/optional for MVP. Structured notifications, support-case updates and permitted Call/WhatsApp contact do not imply a full chat subsystem.

### 3.13 Technology boxes in architecture diagrams

PostgreSQL and the committed data model are implementation decisions.

Redis, Kubernetes, specific queue runtimes, object-storage vendors, maps vendors, SMS/WhatsApp vendors and identity-verification vendors remain target/optional integrations until separately selected/implemented.

## 4. Current Implemented Database Boundary

Implemented:

- `0001` Core Domain
- `0002` Authentication & RBAC
- `0003` Location/Catalogue
- `0004` Provider Services/Areas/Availability/Verification metadata
- `0005` Search/Matching/Leads/Atomic Assignment
- `0006` Repair Jobs/Lifecycle

Not yet implemented as authoritative database modules:

- `0007` Inspection / Versioned Quotation / Completion
- `0008` Off-Platform Payment Acknowledgement
- `0009` Reviews / Complaints / Notifications
- `0010` Subscriptions / Promotions
- `0011` Admin / Reporting
- `0012` Security / Performance Hardening

## 5. Current API Boundary

`STEP_7_API_CONTRACTS.md` Version 2.0 and `docs/api/API_CATALOGUE.md` define the target `/api/v1` surface.

An endpoint appearing in the contract does not mean its application handler is implemented. The migration/implementation matrix determines implementation readiness.

## 6. Historical Documents Rule

The following earlier Steps remain valuable for user journeys, use cases, UI intent, state examples and acceptance criteria, but individual field/table/API examples inside them are not authoritative when they conflict with the synchronized baseline:

- Steps 1–5
- older Step 6 Version 1.0 content
- older Step 7 Version 1.0 content
- Step 8–12 examples not yet synchronized to committed schema names
- older five-dimension review references

Do not delete these files merely because terminology evolved; use this reconciliation baseline to interpret them safely.

## 7. Required Rule for New Work

Before every new migration/application module is considered complete:

1. compare against all previous migrations
2. compare against approved MVP business rules
3. compare against Maldives canonical-location/matching rules
4. compare against `DATA_MODEL_STANDARD.md`
5. update Step 6/Step 7/API catalogue/status matrix where the new module changes the source of truth
6. preserve forward-only migration history
7. add tests for state, ownership, concurrency and financial/geographic invariants

## 8. Next Build Gate

Before or as part of Migration `0007`, implement the DIAGNOSIS_REQUIRED guard so repair cannot begin without the required inspection/diagnosis and approved current quotation version.

After that guard, proceed with Inspection → Versioned Quotation → Customer Approval → Completion structures.