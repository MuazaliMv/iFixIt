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

14. [`STEP_12_BUSINESS_SPECIFICATION_RECONCILIATION.md`](STEP_12_BUSINESS_SPECIFICATION_RECONCILIATION.md)  
    Reconciles the comprehensive Maldives Handyman & Local Services business specification with the existing iFixIt blueprint. Adds previously missing/partial requirements such as direct Call/WhatsApp contact, favourites, richer availability, expanded pricing models, subscription entitlements, service catalogue seed scope, provider KPIs, broader reporting, launch/marketing guidance, and long-term expansion while preserving approved MVP and island-matching rules.

15. [`STEP_13_CUSTOMER_COMPLAINT_AND_RATING_SYSTEM.md`](STEP_13_CUSTOMER_COMPLAINT_AND_RATING_SYSTEM.md)  
    Records only complaint/rating requirements not already fully covered: complaint entry points and customer tracking, complaint evidence/requested outcomes and priority/escalation, four-dimension rating reconciliation, rating prompts and aggregation, provider review responses, review flags/moderation, data/API additions, and acceptance criteria. Existing complaint states, permissions, audit, media security, notifications, and customer-payment scope remain authoritative.

16. [`STEP_14_PROVIDER_SUBSCRIPTION_LAUNCH_PROMOTION.md`](STEP_14_PROVIDER_SUBSCRIPTION_LAUNCH_PROMOTION.md)  
    Records the provider launch-promotion model: Professional plan MVR 299 standard price, staged Day 1–90 promotional charges, founding-provider designation, lifetime early-adopter discount candidates, billing-timeline UI, promotion notifications, campaign data model, billing controls, reporting, acceptance criteria, and unresolved billing-period/discount-stacking rules.

17. [`STEP_14A_PROVIDER_PROMOTION_UI_MESSAGING_AND_FORECAST.md`](STEP_14A_PROVIDER_PROMOTION_UI_MESSAGING_AND_FORECAST.md)  
    Captures the remaining provider-promotion details not explicit in Step 14: stage-specific CTAs, pricing acknowledgement flow, billing-schedule/payment actions, annual-plan upsell, Founding Provider badge sharing, editable example campaign messages, truthful scarcity display, source financial forecast figures as planning assumptions only, and stage-specific commercial objectives/goal tracking.

18. [`STEP_15_JOB_ACCEPTANCE_AND_CUSTOMER_NOTIFICATION_SYSTEM.md`](STEP_15_JOB_ACCEPTANCE_AND_CUSTOMER_NOTIFICATION_SYSTEM.md)  
    Defines provider acceptance through app/web plus optional WhatsApp/SMS channels, atomic eligibility/concurrency checks, provider message-on-accept, customer confirmation UX, multi-channel notification delivery, timeline updates, delivery-state integrity, and acceptance-race handling.

19. [`STEP_16_OFF_PLATFORM_CUSTOMER_PROVIDER_PAYMENT_CONFIRMATION.md`](STEP_16_OFF_PLATFORM_CUSTOMER_PROVIDER_PAYMENT_CONFIRMATION.md)  
    Defines the customer-to-provider direct repair-payment bridge: provider payment-method settings, customer payment acknowledgement, provider receipt confirmation, off-platform payment records, disagreement/evidence handling, privacy/security, reporting, and explicit non-goals that keep repair funds outside iFixIt.

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

Step 12 now accounts for additional business requirements that were not fully represented before, including public Call/WhatsApp contact, favourites/saved locations, richer provider/verification data, expanded pricing/availability/search, configurable subscription entitlements, detailed service seed scope, provider KPIs, broader reporting, mobile-first onboarding, launch/marketing guidance and long-term expansion.

Step 13 additionally captures detailed complaint/rating entry points, evidence/tracking, rating calculations, provider responses, review moderation, API/data additions and acceptance criteria.

Steps 14–14A capture staged launch subscription pricing, Founding Provider/lifetime-discount candidates, campaign billing schedule, provider-facing promotion UI, campaign messaging, truthful scarcity controls, annual-plan upsell, campaign objectives, planning forecasts and conversion reporting. The source strategy's stated `MVR 791` first-three-month savings is not treated as a billing constant; final billing-period interpretation remains a commercial decision.

Step 15 additionally captures detailed provider job-acceptance behavior that was not previously explicit:
- app/web acceptance plus optional verified WhatsApp and SMS acceptance
- short-lived/signed/replay-resistant external acceptance actions
- atomic eligibility recheck and assignment-race protection
- provider acceptance confirmation and optional message to customer
- customer `Provider Accepted / Job Confirmed` experience
- push/in-app/SMS/email/WhatsApp notification architecture subject to preferences/policy
- notification delivery/read state must not be falsely claimed
- authoritative active-job timeline and provider acceptance metrics

Step 16 additionally captures the off-platform repair-payment bridge that was not previously explicit:
- provider-configured accepted payment methods and protected payment instructions
- customer `I Have Paid` declaration
- independent provider `Payment Received` confirmation
- repair-payment record separate from iFixIt subscription-payment transactions
- mismatched declarations, payment evidence and payment-issue/dispute handling
- off-platform payment status/history and reporting
- explicit separation between job completion and payment acknowledgement
- no escrow, wallet, repair checkout, provider payout, split payment or automatic repair refund in MVP

Items marked **NEEDS DECISION** in supporting steps are not production-frozen until explicitly approved.

## Development Gate

Do not treat the documentation as production-approved merely because the files exist. The MVP business decisions above are approved, but customer/provider market validation should still be completed before committing to a full production build. Each step contains an approval checklist. Before production coding begins, any remaining open business decisions should be resolved or explicitly deferred and Steps 5–16 should be reviewed against the approved MVP baseline, local-island architecture and supplemental Steps 12–16.

Recommended implementation order after approval:

`Project scaffold → Authentication → Canonical Atoll/Island Master → Catalogue/Locations → Provider onboarding → Provider operational bases/service areas → Provider search → Direct Booking/Smart Matching → Local-first matching/fallback → Repair requests → Provider acceptance/customer confirmation → Jobs/Inspections → Fixed-price/Quotation workflows → Repair progress → Off-platform payment acknowledgement → Reviews/Complaints/Warranty → Subscriptions/Promotion/Payments → Admin/Reporting → Security/Performance hardening`

## Core Lifecycles

### FIXED_PRICE

`Select Service → Provider/Matching → Booking → Acceptance → Schedule → Service → Completion → Off-platform payment acknowledgement where used → Review`

### DIAGNOSIS_REQUIRED

`Request → Provider/Matching → Acceptance → Inspection → Diagnosis → Quotation → Customer Approval → Repair → Completion → Off-platform payment acknowledgement where used → Review / Warranty`

### LOCAL-FIRST MATCHING

`Canonical Service Island → Exact Local Operational-Base Providers → Target-Island Service-Area Providers → Same-Atoll Fallback if Allowed → Cross-Atoll/Special Dispatch if Explicitly Allowed → Manual Review/No Provider`
