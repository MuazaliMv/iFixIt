# iFixIt

Repair-service marketplace and workflow platform.

## Project Status

The project has moved from specification-only work into **early implementation**. The approved business and geographic baselines remain authoritative, and PostgreSQL migrations `0001` through `0006` now implement the initial identity, geography, catalogue, provider, search/matching, lead/assignment and repair-job lifecycle foundations.

Architecture diagrams describe the **target MVP architecture**. Use the implementation-status matrix to distinguish committed foundations from planned modules and optional integrations.

## Architecture

- [`docs/architecture/DATA_MODEL_STANDARD.md`](docs/architecture/DATA_MODEL_STANDARD.md) — authoritative PostgreSQL data-model standard: domain-driven normalized relational modeling, canonical master data, explicit state machines, append-oriented history and strict financial-domain separation.
- [`docs/architecture/CONTEXT_DIAGRAM_OVERVIEW.md`](docs/architecture/CONTEXT_DIAGRAM_OVERVIEW.md) — architecture package index and migration traceability.
- [`docs/architecture/CONTEXT_DIAGRAM_LEVEL_0.md`](docs/architecture/CONTEXT_DIAGRAM_LEVEL_0.md) — business/system context.
- [`docs/architecture/CONTEXT_DIAGRAM_LEVEL_1.md`](docs/architecture/CONTEXT_DIAGRAM_LEVEL_1.md) — major platform capabilities.
- [`docs/architecture/CONTEXT_DIAGRAM_LEVEL_2.md`](docs/architecture/CONTEXT_DIAGRAM_LEVEL_2.md) — application layers, data flows and trust boundaries.
- [`docs/architecture/CONTEXT_DIAGRAM_LEVEL_3.md`](docs/architecture/CONTEXT_DIAGRAM_LEVEL_3.md) — detailed target system-of-systems view.
- [`docs/architecture/IMPLEMENTED_VS_TARGET_ARCHITECTURE.md`](docs/architecture/IMPLEMENTED_VS_TARGET_ARCHITECTURE.md) — authoritative implemented-vs-planned matrix.

The Markdown context diagrams use repo-native Mermaid so they remain reviewable and version-controlled directly in GitHub.

## API Catalogue

- [`docs/api/API_CATALOGUE.md`](docs/api/API_CATALOGUE.md) — consolidated `/api/v1` endpoint catalogue and implementation sequencing for authentication, catalogue/search, provider onboarding, matching/leads, jobs, quotations, off-platform payment acknowledgement, reviews/complaints, subscriptions/promotions, notifications and admin/reporting.
- [`STEP_7_API_CONTRACTS.md`](STEP_7_API_CONTRACTS.md) — detailed REST API contract baseline covering authorization, idempotency, error conventions and protected-resource behavior.

## Implementation Migrations

1. [`migrations/0001_core_domain.sql`](migrations/0001_core_domain.sql) — Users, canonical Atolls/Islands, Provider Profiles and Repair Requests.
2. [`migrations/0002_auth_rbac.sql`](migrations/0002_auth_rbac.sql) — OTP/authentication foundation, sessions, roles, permissions and security events.
3. [`migrations/0003_location_catalogue.sql`](migrations/0003_location_catalogue.sql) — Island aliases and Category → Subcategory → Exact Service catalogue.
4. [`migrations/0004_provider_onboarding_service_areas_availability.sql`](migrations/0004_provider_onboarding_service_areas_availability.sql) — Provider exact services, pricing, service areas, availability and verification metadata.
5. [`migrations/0005_search_tier_matching_engine.sql`](migrations/0005_search_tier_matching_engine.sql) — Tier 0–3 search/matching, matching audit, leads, assignments and atomic acceptance.
6. [`migrations/0006_repair_jobs_lifecycle.sql`](migrations/0006_repair_jobs_lifecycle.sql) — Repair jobs, job state machine, schedule/status history, progress timeline, request/job synchronization and safe reassignment linkage.

Planned sequence: `0007 Inspection / Versioned Quotation / Completion → 0008 Off-Platform Payment Acknowledgement → 0009 Reviews / Complaints / Notifications → 0010 Subscriptions / Promotions → 0011 Admin / Reporting → 0012 Security / Performance Hardening`.

## Documentation Roadmap

### MVP Business Model Baseline

0. [`MVP_BUSINESS_MODEL_AND_SCOPE_FREEZE.md`](MVP_BUSINESS_MODEL_AND_SCOPE_FREEZE.md)  
   Approved MVP business-model baseline. Defines Direct Provider Booking + Smart Matching, FIXED_PRICE + DIAGNOSIS_REQUIRED service workflows, provider-subscription monetization, simplified provider workflow, narrow/configurable launch scope, and features deferred to later phases. If an older document conflicts with these approved MVP decisions, this file takes precedence until synchronization.

0A. [`LOCAL_ISLAND_MATCHING_AND_LOCATION_ARCHITECTURE.md`](LOCAL_ISLAND_MATCHING_AND_LOCATION_ARCHITECTURE.md)  
   Approved Maldives geographic matching baseline. Defines canonical atoll/island master data, provider registered vs operational locations, same-island priority, target-island service areas, controlled same-atoll/cross-atoll fallback, GPS validation, matching audit records, API requirements and acceptance criteria. For geographic matching, this file takes precedence over older generic `location match` statements until synchronization.

### Foundation

1. [`SYSTEM_REQUIREMENTS_AND_USE_CASES.md`](SYSTEM_REQUIREMENTS_AND_USE_CASES.md) — Product scope, roles, requirements, lifecycle, non-functional requirements and high-level use cases.
2. [`STEP_1_USER_FLOW_AND_ARCHITECTURE.md`](STEP_1_USER_FLOW_AND_ARCHITECTURE.md) — Customer, provider and admin journeys; matching; lifecycle; architecture baseline.
3. [`STEP_2_DESIGN_AND_TECH_APPROACH.md`](STEP_2_DESIGN_AND_TECH_APPROACH.md) — Wireframes, design direction, responsive approach and technical architecture.

### Functional Definition

4. [`STEP_3_USE_CASE_HIERARCHY.md`](STEP_3_USE_CASE_HIERARCHY.md) — Level 1 business use cases → Level 2 functional use cases → Level 3 implementation scenarios.
5. [`STEP_3_DETAILED_USE_CASES_AND_BUSINESS_RULES.md`](STEP_3_DETAILED_USE_CASES_AND_BUSINESS_RULES.md) — Detailed actors, preconditions, main/alternate/error flows, business rules, data effects and notifications.
6. [`STEP_4_FINAL_UI_AND_SCREEN_SPECIFICATION.md`](STEP_4_FINAL_UI_AND_SCREEN_SPECIFICATION.md) — Four UI levels: journey, screen/page, component, and state/interaction behavior.
7. [`STEP_5_FUNCTIONAL_SPECIFICATION_FREEZE.md`](STEP_5_FUNCTIONAL_SPECIFICATION_FREEZE.md) — Final pre-database mapping of screens, actions, fields, permissions, state effects, notifications and audit requirements.

### Technical Design

8. [`STEP_6_DATABASE_SCHEMA_AND_DATA_DICTIONARY.md`](STEP_6_DATABASE_SCHEMA_AND_DATA_DICTIONARY.md) — Logical PostgreSQL schema, fields, relationships, constraints, indexes, history, retention and data rules.
9. [`STEP_7_API_CONTRACTS.md`](STEP_7_API_CONTRACTS.md) — REST API endpoints, authorization, idempotency, error model and protected resource behavior.
10. [`STEP_8_ROLES_AND_PERMISSION_MATRIX.md`](STEP_8_ROLES_AND_PERMISSION_MATRIX.md) — Customer, provider and admin authorization matrix with recommended granular permissions.
11. [`STEP_9_FORMAL_STATE_TRANSITION_MATRICES.md`](STEP_9_FORMAL_STATE_TRANSITION_MATRICES.md) — Allowed state transitions for provider, request, lead, assignment, inspection, quotation, job, warranty, complaint, subscription and payment workflows.
12. [`STEP_10_TEST_CASES_AND_ACCEPTANCE_CRITERIA.md`](STEP_10_TEST_CASES_AND_ACCEPTANCE_CRITERIA.md) — Positive, failure, authorization, security, concurrency, performance and end-to-end acceptance criteria.
13. [`STEP_11_UML_SYSTEM_DESIGN.md`](STEP_11_UML_SYSTEM_DESIGN.md) — UML implementation blueprint covering use cases, domain classes, matching sequences, job state lifecycle and component architecture.
14. [`STEP_12_BUSINESS_SPECIFICATION_RECONCILIATION.md`](STEP_12_BUSINESS_SPECIFICATION_RECONCILIATION.md) — Reconciles expanded marketplace/business requirements while preserving approved MVP and island rules.
15. [`STEP_13_CUSTOMER_COMPLAINT_AND_RATING_SYSTEM.md`](STEP_13_CUSTOMER_COMPLAINT_AND_RATING_SYSTEM.md) — Detailed complaint/rating entry points, evidence, tracking, moderation and API/data additions.
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

## Newly Reconciled Business Requirements

Step 12 accounts for public Call/WhatsApp contact, favourites/saved locations, richer provider/verification data, expanded pricing/availability/search, configurable subscription entitlements, detailed service seed scope, provider KPIs, broader reporting, mobile-first onboarding, launch/marketing guidance and long-term expansion.

Step 13 captures detailed complaint/rating entry points, evidence/tracking, rating calculations, provider responses, review moderation, API/data additions and acceptance criteria.

Steps 14–14A capture staged launch subscription pricing, Founding Provider/lifetime-discount candidates, campaign billing schedule, provider-facing promotion UI, campaign messaging, truthful scarcity controls, annual-plan upsell, campaign objectives, planning forecasts and conversion reporting. The source strategy's stated `MVR 791` first-three-month savings is not treated as a billing constant; final billing-period interpretation remains a commercial decision.

Step 15 captures app/web acceptance plus optional verified WhatsApp/SMS acceptance, short-lived/replay-resistant external actions, atomic eligibility recheck and assignment-race protection, provider acceptance confirmation, customer `Provider Accepted / Job Confirmed` experience, and notification-delivery integrity.

Step 16 captures provider-configured repair payment methods, customer `I Have Paid`, provider `Payment Received`, separate off-platform payment records, disagreement/evidence handling, and the explicit prohibition on escrow, wallet, repair checkout, provider payout, split payment or automatic repair refund in MVP.

Items marked **NEEDS DECISION** in supporting steps are not production-frozen until explicitly approved.

## Development Gate

The approved MVP business/geographic decisions remain the business source of truth, while the committed migrations are now the implementation source of truth for capabilities already built. Customer/provider market validation should still inform configuration choices before full production launch.

Before each new migration/application module is considered complete, reconcile it against:

- `MVP_BUSINESS_MODEL_AND_SCOPE_FREEZE.md`
- `LOCAL_ISLAND_MATCHING_AND_LOCATION_ARCHITECTURE.md`
- `docs/architecture/DATA_MODEL_STANDARD.md`
- `docs/architecture/IMPLEMENTED_VS_TARGET_ARCHITECTURE.md`
- the applicable detailed Step documents
- all prior committed migrations

Recommended implementation order:

`Project scaffold → Authentication → Canonical Atoll/Island Master → Catalogue/Locations → Provider onboarding → Provider operational bases/service areas → Provider search → Direct Booking/Smart Matching → Local-first matching/fallback → Repair requests → Provider acceptance/customer confirmation → Jobs/Inspections → Fixed-price/Quotation workflows → Repair progress → Off-platform payment acknowledgement → Reviews/Complaints/Warranty → Subscriptions/Promotion/Payments → Admin/Reporting → Security/Performance hardening`

## Core Lifecycles

### FIXED_PRICE

`Select Service → Provider/Matching → Booking → Acceptance → Schedule → Service → Completion → Off-platform payment acknowledgement where used → Review`

### DIAGNOSIS_REQUIRED

`Request → Provider/Matching → Acceptance → Inspection → Diagnosis → Quotation → Customer Approval → Repair → Completion → Off-platform payment acknowledgement where used → Review / Warranty`

### LOCAL-FIRST MATCHING

`Canonical Service Island → Exact Local Operational-Base Providers → Target-Island Service-Area Providers → Same-Atoll Fallback if Allowed → Cross-Atoll/Special Dispatch if Explicitly Allowed → Manual Review/No Provider`
