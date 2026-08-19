# iFixIt

Repair-service marketplace and workflow platform.

## Documentation Roadmap

The repository is currently in the **pre-coding specification and validation phase**. Development should follow the documents below in order.

### MVP Business Model Baseline

0. [`MVP_BUSINESS_MODEL_AND_SCOPE_FREEZE.md`](MVP_BUSINESS_MODEL_AND_SCOPE_FREEZE.md)  
   Approved MVP business-model baseline. Defines Direct Provider Booking + Smart Matching, FIXED_PRICE + DIAGNOSIS_REQUIRED service workflows, provider-subscription monetization, simplified provider workflow, narrow/configurable launch scope, and features deferred to later phases. If an older document conflicts with these approved MVP decisions, this file takes precedence until synchronization.

0A. [`LOCAL_ISLAND_MATCHING_AND_LOCATION_ARCHITECTURE.md`](LOCAL_ISLAND_MATCHING_AND_LOCATION_ARCHITECTURE.md)  
   Approved Maldives geographic matching baseline. Defines canonical atoll/island master data, provider registered vs operational locations, same-island priority, target-island service areas, controlled same-atoll/cross-atoll fallback, GPS validation, matching audit records, API requirements and acceptance criteria. For geographic matching, this file takes precedence over older generic `location match` statements until synchronization.

### Foundation

1. [`SYSTEM_REQUIREMENTS_AND_USE_CASES.md`](SYSTEM_REQUIREMENTS_AND_USE_CASES.md)  
   Product scope, roles, requirements, lifecycle, non-functional requirements and high-level use cases.

2. [`STEP_1_USER_FLOW_AND_ARCHITECTURE.md`](STEP_1_USER_FLOW_AND_ARCHITECTURE.md)  
   Customer, provider and admin journeys; matching; lifecycle; architecture baseline.

3. [`STEP_2_DESIGN_AND_TECH_APPROACH.md`](STEP_2_DESIGN_AND_TECH_APPROACH.md)  
   Wireframes, design direction, responsive approach and technical architecture.

### Functional Definition

4. [`STEP_3_USE_CASE_HIERARCHY.md`](STEP_3_USE_CASE_HIERARCHY.md)  
   Level 1 business use cases → Level 2 functional use cases → Level 3 implementation scenarios.

5. [`STEP_3_DETAILED_USE_CASES_AND_BUSINESS_RULES.md`](STEP_3_DETAILED_USE_CASES_AND_BUSINESS_RULES.md)  
   Detailed actors, preconditions, main/alternate/error flows, business rules, data effects and notifications.

6. [`STEP_4_FINAL_UI_AND_SCREEN_SPECIFICATION.md`](STEP_4_FINAL_UI_AND_SCREEN_SPECIFICATION.md)  
   Four UI levels: journey, screen/page, component, and state/interaction behavior.

7. [`STEP_5_FUNCTIONAL_SPECIFICATION_FREEZE.md`](STEP_5_FUNCTIONAL_SPECIFICATION_FREEZE.md)  
   Final pre-database mapping of screens, actions, fields, permissions, state effects, notifications and audit requirements.

### Technical Design

8. [`STEP_6_DATABASE_SCHEMA_AND_DATA_DICTIONARY.md`](STEP_6_DATABASE_SCHEMA_AND_DATA_DICTIONARY.md)  
   Logical PostgreSQL schema, fields, relationships, constraints, indexes, history, retention and data rules.

9. [`STEP_7_API_CONTRACTS.md`](STEP_7_API_CONTRACTS.md)  
   REST API endpoints, authorization, idempotency, error model and protected resource behavior.

10. [`STEP_8_ROLES_AND_PERMISSION_MATRIX.md`](STEP_8_ROLES_AND_PERMISSION_MATRIX.md)  
    Customer, provider and admin authorization matrix with recommended granular permissions.

11. [`STEP_9_FORMAL_STATE_TRANSITION_MATRICES.md`](STEP_9_FORMAL_STATE_TRANSITION_MATRICES.md)  
    Allowed state transitions for provider, request, lead, assignment, inspection, quotation, job, warranty, complaint, subscription and payment workflows.

12. [`STEP_10_TEST_CASES_AND_ACCEPTANCE_CRITERIA.md`](STEP_10_TEST_CASES_AND_ACCEPTANCE_CRITERIA.md)  
    Positive, failure, authorization, security, concurrency, performance and end-to-end acceptance criteria.

13. [`STEP_11_UML_SYSTEM_DESIGN.md`](STEP_11_UML_SYSTEM_DESIGN.md)  
    UML implementation blueprint covering system use cases, domain classes, customer repair activity, Maldives local-island matching activity, Smart Matching and Direct Provider Booking sequences, repair-job state lifecycle, component architecture, and cross-document traceability.

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

## Development Gate

Do not treat the documentation as production-approved merely because the files exist. The MVP business decisions above are approved, but customer/provider market validation should still be completed before committing to a full production build. Each step contains an approval checklist. Before production coding begins, any remaining open business decisions should be resolved or explicitly deferred and Steps 5–11 should be reviewed against `MVP_BUSINESS_MODEL_AND_SCOPE_FREEZE.md` and `LOCAL_ISLAND_MATCHING_AND_LOCATION_ARCHITECTURE.md`.

Recommended implementation order after approval:

`Project scaffold → Authentication → Canonical Atoll/Island Master → Catalogue/Locations → Provider onboarding → Provider operational bases/service areas → Provider search → Direct Booking/Smart Matching → Local-first matching/fallback → Repair requests → Jobs/Inspections → Fixed-price/Quotation workflows → Repair progress → Reviews/Complaints/Warranty → Subscriptions/Payments → Admin/Reporting → Security/Performance hardening`

## Core Lifecycles

### FIXED_PRICE

`Select Service → Provider/Matching → Booking → Acceptance → Schedule → Service → Completion → Review`

### DIAGNOSIS_REQUIRED

`Request → Provider/Matching → Acceptance → Inspection → Diagnosis → Quotation → Customer Approval → Repair → Completion → Review / Warranty`

### LOCAL-FIRST MATCHING

`Canonical Service Island → Exact Local Operational-Base Providers → Target-Island Service-Area Providers → Same-Atoll Fallback if Allowed → Cross-Atoll/Special Dispatch if Explicitly Allowed → Manual Review/No Provider`
