# iFixIt

Repair-service marketplace and workflow platform.

## Project Status

The project has moved from specification-only work into **early implementation**. PostgreSQL migrations `0001` through `0006` implement the identity, canonical Maldives geography, service catalogue, provider onboarding/service areas/availability, search/matching, leads/atomic assignment and repair-job lifecycle foundations.

A repository-wide specification synchronization pass has now aligned the current database dictionary, API contracts and complaint/rating model with those migrations and the approved MVP/geographic rules.

## Source-of-Truth Order

Use the following precedence when repository documents disagree:

1. committed migrations for implemented structures/invariants
2. [`MVP_BUSINESS_MODEL_AND_SCOPE_FREEZE.md`](MVP_BUSINESS_MODEL_AND_SCOPE_FREEZE.md)
3. [`LOCAL_ISLAND_MATCHING_AND_LOCATION_ARCHITECTURE.md`](LOCAL_ISLAND_MATCHING_AND_LOCATION_ARCHITECTURE.md)
4. [`docs/architecture/DATA_MODEL_STANDARD.md`](docs/architecture/DATA_MODEL_STANDARD.md)
5. [`docs/architecture/SPECIFICATION_SYNCHRONIZATION_BASELINE.md`](docs/architecture/SPECIFICATION_SYNCHRONIZATION_BASELINE.md)
6. synchronized Step 6 / Step 7 / Step 13 documents and API catalogue
7. older Step examples only where they do not conflict with a higher source

## Architecture

- [`docs/architecture/DATA_MODEL_STANDARD.md`](docs/architecture/DATA_MODEL_STANDARD.md) — authoritative PostgreSQL data-model standard: domain-driven normalized relational modeling, canonical master data, explicit state machines, append-oriented history and strict financial-domain separation.
- [`docs/architecture/SPECIFICATION_SYNCHRONIZATION_BASELINE.md`](docs/architecture/SPECIFICATION_SYNCHRONIZATION_BASELINE.md) — authoritative reconciliation record resolving legacy/current terminology, rating, payment, geography, RBAC and workflow differences.
- [`docs/architecture/CONTEXT_DIAGRAM_OVERVIEW.md`](docs/architecture/CONTEXT_DIAGRAM_OVERVIEW.md) — architecture package index and migration traceability.
- [`docs/architecture/CONTEXT_DIAGRAM_LEVEL_0.md`](docs/architecture/CONTEXT_DIAGRAM_LEVEL_0.md) — business/system context.
- [`docs/architecture/CONTEXT_DIAGRAM_LEVEL_1.md`](docs/architecture/CONTEXT_DIAGRAM_LEVEL_1.md) — major platform capabilities.
- [`docs/architecture/CONTEXT_DIAGRAM_LEVEL_2.md`](docs/architecture/CONTEXT_DIAGRAM_LEVEL_2.md) — application layers, data flows and trust boundaries.
- [`docs/architecture/CONTEXT_DIAGRAM_LEVEL_3.md`](docs/architecture/CONTEXT_DIAGRAM_LEVEL_3.md) — detailed target system-of-systems view.
- [`docs/architecture/IMPLEMENTED_VS_TARGET_ARCHITECTURE.md`](docs/architecture/IMPLEMENTED_VS_TARGET_ARCHITECTURE.md) — authoritative implemented-vs-planned matrix.

The Markdown context diagrams use repo-native Mermaid so they remain reviewable and version-controlled directly in GitHub.

## API Catalogue

- [`docs/api/API_CATALOGUE.md`](docs/api/API_CATALOGUE.md) — synchronized `/api/v1` implementation index using canonical atoll/island APIs, current-user identity, Direct/Smart Matching, job lifecycle, off-platform repair-payment acknowledgement, reviews/complaints, subscriptions/promotions, notifications and admin/reporting.
- [`STEP_7_API_CONTRACTS.md`](STEP_7_API_CONTRACTS.md) — synchronized Version 2.0 detailed REST API contract covering authorization, idempotency, canonical geography, state rules and financial-domain separation.

## Implementation Migrations

1. [`migrations/0001_core_domain.sql`](migrations/0001_core_domain.sql) — Users, canonical Atolls/Islands, Provider Profiles and Repair Requests.
2. [`migrations/0002_auth_rbac.sql`](migrations/0002_auth_rbac.sql) — OTP/authentication foundation, sessions, roles, permissions and security events.
3. [`migrations/0003_location_catalogue.sql`](migrations/0003_location_catalogue.sql) — Island aliases and the original service-catalogue foundation. The active application now exposes top-level service groups only; [`migrations/20260826_services_component_remove_subcategories.sql`](migrations/20260826_services_component_remove_subcategories.sql) retires the legacy child-service paths without deleting historical columns.
4. [`migrations/0004_provider_onboarding_service_areas_availability.sql`](migrations/0004_provider_onboarding_service_areas_availability.sql) — Provider exact services, pricing, service areas, availability and verification metadata.
5. [`migrations/0005_search_tier_matching_engine.sql`](migrations/0005_search_tier_matching_engine.sql) — Tier 0–3 search/matching, matching audit, leads, assignments and atomic acceptance.
6. [`migrations/0006_repair_jobs_lifecycle.sql`](migrations/0006_repair_jobs_lifecycle.sql) — Repair jobs, job state machine, schedule/status history, progress timeline, request/job synchronization and safe reassignment linkage.

Planned sequence: `0007 Inspection / Versioned Quotation / Completion + DIAGNOSIS_REQUIRED integrity guard → 0008 Off-Platform Payment Acknowledgement → 0009 Reviews / Complaints / Notifications → 0010 Subscriptions / Promotions → 0011 Admin / Reporting → 0012 Security / Performance Hardening`.

## Documentation Roadmap

### MVP Business Model Baseline

0. [`MVP_BUSINESS_MODEL_AND_SCOPE_FREEZE.md`](MVP_BUSINESS_MODEL_AND_SCOPE_FREEZE.md)  
   Approved MVP business-model baseline. Defines Direct Provider Booking + Smart Matching, FIXED_PRICE + DIAGNOSIS_REQUIRED service workflows, provider-subscription monetization, simplified provider workflow, narrow/configurable launch scope, and features deferred to later phases.

0A. [`LOCAL_ISLAND_MATCHING_AND_LOCATION_ARCHITECTURE.md`](LOCAL_ISLAND_MATCHING_AND_LOCATION_ARCHITECTURE.md)  
   Approved Maldives geographic matching baseline. Defines canonical atoll/island master data, provider registered vs operational locations, same-island priority, target-island service areas, controlled same-atoll/cross-atoll fallback, GPS validation, matching audit records, API requirements and acceptance criteria.

### Foundation

1. [`SYSTEM_REQUIREMENTS_AND_USE_CASES.md`](SYSTEM_REQUIREMENTS_AND_USE_CASES.md) — Product scope, roles, requirements, lifecycle, non-functional requirements and high-level use cases.
2. [`STEP_1_USER_FLOW_AND_ARCHITECTURE.md`](STEP_1_USER_FLOW_AND_ARCHITECTURE.md) — Customer, provider and admin journeys; matching; lifecycle; architecture baseline.
3. [`STEP_2_DESIGN_AND_TECH_APPROACH.md`](STEP_2_DESIGN_AND_TECH_APPROACH.md) — Wireframes, design direction, responsive approach and technical architecture.

### Functional Definition

4. [`STEP_3_USE_CASE_HIERARCHY.md`](STEP_3_USE_CASE_HIERARCHY.md) — Level 1 business use cases → Level 2 functional use cases → Level 3 implementation scenarios.
5. [`STEP_3_DETAILED_USE_CASES_AND_BUSINESS_RULES.md`](STEP_3_DETAILED_USE_CASES_AND_BUSINESS_RULES.md) — Detailed actors, preconditions, main/alternate/error flows, business rules, data effects and notifications. Older field examples are interpreted through the synchronization baseline.
6. [`STEP_4_FINAL_UI_AND_SCREEN_SPECIFICATION.md`](STEP_4_FINAL_UI_AND_SCREEN_SPECIFICATION.md) — Journey, screen/page, component and state/interaction behavior. Older field labels are interpreted through the synchronization baseline.
7. [`STEP_5_FUNCTIONAL_SPECIFICATION_FREEZE.md`](STEP_5_FUNCTIONAL_SPECIFICATION_FREEZE.md) — Screen/action/permission/state effects and audit requirements. Current schema/API names take precedence where terminology evolved.

### Technical Design

8. [`STEP_6_DATABASE_SCHEMA_AND_DATA_DICTIONARY.md`](STEP_6_DATABASE_SCHEMA_AND_DATA_DICTIONARY.md) — **Version 2.0 synchronized logical data model** matching migrations `0001`–`0006` and planned `0007`–`0012` domains.
9. [`STEP_7_API_CONTRACTS.md`](STEP_7_API_CONTRACTS.md) — **Version 2.0 synchronized REST API contract**.
10. [`STEP_8_ROLES_AND_PERMISSION_MATRIX.md`](STEP_8_ROLES_AND_PERMISSION_MATRIX.md) — Customer, provider and admin authorization matrix; implemented normalized RBAC remains authoritative.
11. [`STEP_9_FORMAL_STATE_TRANSITION_MATRICES.md`](STEP_9_FORMAL_STATE_TRANSITION_MATRICES.md) — State-transition design; committed Migration 0006 is authoritative for implemented job states.
12. [`STEP_10_TEST_CASES_AND_ACCEPTANCE_CRITERIA.md`](STEP_10_TEST_CASES_AND_ACCEPTANCE_CRITERIA.md) — Positive, failure, authorization, security, concurrency, performance and end-to-end criteria.
13. [`STEP_11_UML_SYSTEM_DESIGN.md`](STEP_11_UML_SYSTEM_DESIGN.md) — UML implementation blueprint; current migrations/synchronization baseline take precedence on exact schema names.
14. [`STEP_12_BUSINESS_SPECIFICATION_RECONCILIATION.md`](STEP_12_BUSINESS_SPECIFICATION_RECONCILIATION.md) — Expanded marketplace/business requirements; where it still references the older five-dimension rating model, synchronized Step 13 Version 2.0 supersedes that detail.
15. [`STEP_13_CUSTOMER_COMPLAINT_AND_RATING_SYSTEM.md`](STEP_13_CUSTOMER_COMPLAINT_AND_RATING_SYSTEM.md) — **Version 2.0 synchronized complaint/rating specification**, resolving the MVP rating model to Quality, Punctuality, Communication and Value for Money.
16. [`STEP_14_PROVIDER_SUBSCRIPTION_LAUNCH_PROMOTION.md`](STEP_14_PROVIDER_SUBSCRIPTION_LAUNCH_PROMOTION.md) — Provider launch-promotion pricing, Founding Provider model, campaign rules and reporting.
17. [`STEP_14A_PROVIDER_PROMOTION_UI_MESSAGING_AND_FORECAST.md`](STEP_14A_PROVIDER_PROMOTION_UI_MESSAGING_AND_FORECAST.md) — Promotion UI, messaging, annual-plan upsell and forecast assumptions.
18. [`STEP_15_JOB_ACCEPTANCE_AND_CUSTOMER_NOTIFICATION_SYSTEM.md`](STEP_15_JOB_ACCEPTANCE_AND_CUSTOMER_NOTIFICATION_SYSTEM.md) — Provider acceptance, concurrency checks, customer confirmation and multi-channel notification architecture.
19. [`STEP_16_OFF_PLATFORM_CUSTOMER_PROVIDER_PAYMENT_CONFIRMATION.md`](STEP_16_OFF_PLATFORM_CUSTOMER_PROVIDER_PAYMENT_CONFIRMATION.md) — Direct customer/provider repair-payment acknowledgement, disagreement handling and non-goals.

## Approved MVP Business Decisions

- Two booking models: **Direct Provider Booking** and **Smart Matching**.
- Two service workflows: **FIXED_PRICE** and **DIAGNOSIS_REQUIRED**.
- Customer repair settlement remains outside MVP; customers pay providers directly/off-platform.
- Provider subscription payments remain in scope and are the initial monetization model.
- Provider workflow is intentionally simplified for MVP.
- Launch scope should be narrow operationally but configurable through admin/master data.
- Advanced operations belong to Phase 2; AI/intelligent capabilities belong to Phase 3.
- Geographic matching uses canonical **atoll/island IDs**, never free-text island equality.
- Matching prioritizes providers physically based on the exact service island before controlled fallback.
- Provider legal registration location is kept separate from operational base and approved service areas.
- Same-atoll and cross-atoll expansion must be explicit, auditable and policy-controlled.
- The synchronized MVP review model uses **four dimensions**: Quality, Punctuality, Communication and Value for Money.

## Reconciled Business Requirements

Step 12 accounts for public Call/WhatsApp contact, favourites/saved locations, richer provider/verification data, expanded pricing/availability/search, configurable subscription entitlements, detailed service seed scope, provider KPIs, broader reporting, mobile-first onboarding, launch/marketing guidance and long-term expansion.

Step 13 Version 2.0 resolves complaint/rating entry points, evidence/tracking, four-dimension rating calculations, provider responses, review moderation, API/data additions and acceptance criteria.

Steps 14–14A capture staged launch subscription pricing, Founding Provider/lifetime-discount candidates, campaign billing schedule, provider-facing promotion UI, campaign messaging, truthful scarcity controls, annual-plan upsell, campaign objectives, planning forecasts and conversion reporting. Values marked as planning assumptions or NEEDS DECISION remain configurable until explicitly frozen.

Step 15 captures app/web acceptance plus optional verified WhatsApp/SMS acceptance, short-lived/replay-resistant external actions, atomic eligibility recheck and assignment-race protection, provider acceptance confirmation, customer `Provider Accepted / Job Confirmed` experience, and notification-delivery integrity.

Step 16 captures provider-configured repair payment methods, customer `I Have Paid`, provider `Payment Received`, separate off-platform payment records, disagreement/evidence handling, and the explicit prohibition on escrow, wallet, repair checkout, provider payout, split payment or automatic repair refund in MVP.

## Development Gate

The committed migrations are the implementation source of truth for built capabilities. Before every new migration/application module is considered complete, reconcile it against:

- `MVP_BUSINESS_MODEL_AND_SCOPE_FREEZE.md`
- `LOCAL_ISLAND_MATCHING_AND_LOCATION_ARCHITECTURE.md`
- `docs/architecture/DATA_MODEL_STANDARD.md`
- `docs/architecture/SPECIFICATION_SYNCHRONIZATION_BASELINE.md`
- `docs/architecture/IMPLEMENTED_VS_TARGET_ARCHITECTURE.md`
- synchronized Step 6 / Step 7 and applicable detailed Step documents
- all prior migrations

The next build gate is Migration `0007`, which must add the workflow-specific database/service guard preventing `DIAGNOSIS_REQUIRED` repair from starting before required inspection/diagnosis and customer approval of the current quotation version.

## Core Lifecycles

### FIXED_PRICE

`Select Service → Provider/Matching → Booking → Acceptance → Schedule → Service → Completion → Off-platform payment acknowledgement where used → Review`

### DIAGNOSIS_REQUIRED

`Request → Provider/Matching → Acceptance → Inspection → Diagnosis → Versioned Quotation → Customer Approval → Repair → Completion → Off-platform payment acknowledgement where used → Review / Warranty`

### LOCAL-FIRST MATCHING

`Canonical Service Island → Exact Local Operational-Base Providers → Target-Island Service-Area Providers → Same-Atoll Fallback if Allowed → Cross-Atoll/Special Dispatch if Explicitly Allowed → Manual Review/No Provider`
