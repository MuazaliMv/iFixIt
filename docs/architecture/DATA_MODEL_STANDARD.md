# iFixIt — Authoritative Data Model Standard

**Status:** Approved implementation standard  
**Database:** PostgreSQL  
**Model:** Domain-driven normalized relational model with explicit state machines, canonical master data and append-oriented history

## 1. Purpose

This document defines the database modeling standard for iFixIt. It is the authoritative architectural approach for new migrations and schema reviews. Existing migrations are evolved forward; already-applied migrations must not be rewritten to simulate a clean slate.

## 2. Core Modeling Principles

1. PostgreSQL is the authoritative transactional store.
2. Core business relationships use normalized relational tables; JSONB is limited to flexible metadata, snapshots, integration payloads and audit context.
3. UUID primary keys are used for domain/transaction entities.
4. Foreign keys, CHECK constraints, unique constraints and partial unique indexes enforce business integrity at database level where practical.
5. Important business state uses explicit state machines and append-oriented history rather than destructive overwrite.
6. Canonical master data is referenced by immutable IDs.
7. Derived reporting/search structures are not the source of truth.
8. Security is enforced server-side; database design must support RBAC, ownership, relationship and audit checks.
9. Financial domains are separated: customer-to-provider repair-payment acknowledgement is not the same ledger/domain as provider subscription payments to iFixIt.
10. Migration history is forward-only and traceable.

## 3. Bounded Contexts / Data Domains

### Identity & Access
Users, OTP challenges, auth sessions, roles, permissions, user-role mappings and security events.

### Maldives Geography
Atolls, islands and search aliases. Canonical atoll/island IDs are authoritative; free-text names are never matching keys.

### Service Catalogue
Top-level service groups with location availability. Legacy child-service tables and columns are retained only for forward-compatible history and cannot receive new active application data.

### Provider
Provider profile, legal registration location, operational base, service groups, approved service islands, availability, verification documents and status history.

### Customer
Customer profile/preferences, saved locations and favourites. Customer-owned private data remains separate from public provider projections.

### Repair Request
Customer demand record, requested service group, booking model, service location, urgency, scheduling preference and matching authorization.

### Matching & Lead
Matching attempts, candidate snapshots, ranking metrics, provider offers/leads, Direct Booking fallback decisions and exclusive assignments.

### Repair Job
The accepted operational work record. A repair request may result in one logical repair job; assignment history remains separate so provider reassignment history is preserved.

### Inspection & Quotation
Diagnosis/inspection records, quotation headers, immutable quotation versions, line items and customer approval/rejection events.

### Completion / Warranty
Completion evidence, customer confirmation, warranty definition and warranty claims.

### Repair Payment Acknowledgement
Off-platform customer declaration, provider receipt confirmation, evidence and disagreement status. iFixIt does not become custodian of repair funds.

### Trust & Safety
Verified reviews, rating dimensions, complaints, evidence, moderation and resolution history.

### Provider Subscription & Promotion
Plans, entitlements, provider subscriptions, billing periods, platform-payment records and promotional campaign/enrollment data.

### Notifications
Notification intent, delivery attempts/preferences and channel status. Notification failure must not roll back authoritative domain transactions.

### Admin / Audit / Reporting
Append-oriented audit events, configuration/master data controls and derived reporting views/materialized views.

## 4. Relationship Rules

- `users` is identity; provider/customer domain records reference it rather than duplicating authentication identity.
- Provider legal location, operational base and approved service areas are separate concepts.
- Exact `repair_services.id` is the matching capability key.
- `repair_requests` represents customer demand; `repair_leads` represents offers; `repair_assignments` represents exclusive provider assignment history; `repair_jobs` represents accepted operational work. These entities must not be collapsed into one table.
- One active assignment per repair request is enforced in the database.
- A logical repair job is unique per repair request; provider reassignment is preserved through assignment history/current assignment linkage.
- Inspection and quotation are separate from job core because DIAGNOSIS_REQUIRED workflows require versioned approval semantics.
- Reviews require an eligible completed/finalized platform job.
- Complaints/evidence are privacy-sensitive and remain separate from public reviews.
- Subscription payments and repair-payment acknowledgements use separate entities and reporting semantics.

## 5. State-Machine Rule

Every important lifecycle must define legal transitions and record actor/time history. At minimum:

- provider approval/verification/marketplace state
- repair request
- lead
- assignment
- repair job
- inspection
- quotation/version approval
- complaint
- warranty claim
- subscription
- platform payment

Illegal state transitions must be rejected server-side and, for critical invariants, at database function/constraint level.

## 6. History & Audit Rule

History tables are append-oriented. Sensitive changes record at least:

`actor → action/domain → entity → previous state/value → new state/value → reason/context → timestamp`

Normal product/admin operations must not silently delete audit evidence.

## 7. Canonical Geography Rule

The authoritative hierarchy is:

`Maldives → Atoll → Island`

- IDs are authoritative.
- Aliases are search helpers only.
- Disabled islands remain historically referenceable.
- Matching tiers use canonical IDs.
- GPS/radius may assist ranking/validation but never replaces island/service-area authorization.

## 8. Financial Separation Rule

### Repair work
Customer pays provider directly/off-platform. iFixIt may record acknowledgement/evidence but does not hold, escrow, split, payout or automatically refund repair funds in MVP.

### Platform subscription
Provider pays iFixIt for subscription/promotional products. This is a separate platform-payment domain and may use payment-gateway transactions/webhooks.

## 9. JSONB Usage

Appropriate uses:
- ranking score explanation/snapshot
- integration webhook payload/reference metadata
- audit context
- non-authoritative extensible metadata

Do not use JSONB instead of normalized tables for core entities such as services, providers, islands, assignments, quotations, subscriptions or permissions.

## 10. Reporting Rule

Operational source tables remain authoritative. Reporting views/materialized views and search indexes may denormalize for speed, but must be reproducible from authoritative data and must not become the only copy of business state.

## 11. Migration Sequence

```text
0001 Core Domain
0002 Authentication & RBAC
0003 Maldives Location Master & Service Catalogue
0004 Provider Onboarding / Services / Areas / Availability
0005 Search & Tier-Based Matching
0006 Repair Jobs & Lifecycle
0007 Inspection / Versioned Quotation / Completion
0008 Off-Platform Repair Payment Acknowledgement / Disputes
0009 Reviews / Complaints / Notifications
0010 Provider Subscriptions / Promotions / Platform Payments
0011 Admin / Reporting
0012 Security / Performance Hardening
```

## 12. Review Gate for Every New Table

Before approving a new table or migration, verify:

- correct bounded context
- no duplication of an existing source-of-truth field/entity
- PK/FK design
- canonical location references where applicable
- state and transition rules
- history/audit requirements
- privacy classification
- ownership/RBAC implications
- uniqueness/concurrency invariants
- useful indexes
- archival/history behavior
- separation of derived/reporting data from source-of-truth data
- migration compatibility with all prior committed migrations
