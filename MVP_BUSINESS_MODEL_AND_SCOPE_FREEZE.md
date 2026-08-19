# iFixIt — MVP Business Model & Scope Freeze

**Status:** APPROVED BASELINE  
**Date:** 2026-08-19  
**Purpose:** Freeze the MVP business-model decisions that override any earlier ambiguous or broader assumptions in the specification set.

---

## 1. Booking Models

iFixIt MVP supports two customer entry paths.

### 1.1 Direct Provider Booking
Customer selects a specific eligible provider first, then creates a repair request for that provider.

Flow:

`Search/View Provider → Select Provider → Create Request → Provider Accepts/Declines → Continue Repair Workflow`

Rules:
- Provider must still be eligible for the exact service and location.
- Direct booking does not bypass provider verification, account, suspension, or subscription rules.
- If the selected provider declines or the direct-offer timeout expires, the customer must be offered the option to broaden the request into Smart Matching.
- The system must not silently distribute a direct booking to other providers without customer consent.

### 1.2 Smart Matching
Customer creates a repair request without choosing a specific provider. iFixIt identifies and distributes the request to eligible providers.

Flow:

`Create Request → Match Eligible Providers → Provider Response → Assignment → Repair Workflow`

Rules:
- Matching must use exact service and canonical geographic location.
- Suspension and verification restrictions override ranking.
- Matching may consider availability, response performance, rating, workload, and other approved ranking signals after geographic eligibility is established.
- Exclusive acceptance must be concurrency-safe.

---

## 2. Service Types

Every exact repair service must be configured with a workflow type.

### 2.1 FIXED_PRICE
For services that can be sold at a known price without diagnosis.

Example:
- AC cleaning
- standard installation service
- routine maintenance package

Typical flow:

`Select Service → Confirm Price → Book → Provider Accepts → Schedule → Perform Service → Complete`

Rules:
- Inspection is not mandatory unless service configuration explicitly requires it.
- A separate quotation is not required when the fixed price fully defines the authorized work.
- Additional unexpected work requires a change/re-quote before proceeding where it changes customer cost materially.

### 2.2 DIAGNOSIS_REQUIRED
For faults where the final work/cost cannot reasonably be known before inspection.

Example:
- AC not cooling
- appliance fault
- electrical fault
- plumbing leak with unknown cause

Typical flow:

`Request → Provider → Inspection → Diagnosis → Quotation → Customer Approval → Repair → Completion`

Rules:
- Repair must not proceed beyond approved limits until the customer approves the current quote version.
- Quote revision requires customer re-approval.

---

## 3. Customer Repair Payments

### MVP Decision
Customer-to-provider repair settlement is **OUT OF MVP**.

MVP flow:

`Customer books through iFixIt → Provider performs repair → Customer pays provider directly/off-platform`

Rules:
- iFixIt may record quoted/final repair amounts for workflow/history/reporting.
- iFixIt does not hold customer repair funds, perform provider payouts, or act as repair-payment escrow in MVP.
- Refund settlement between customer and provider is outside automated MVP payment processing unless separately approved later.

### In Scope Payment
Provider subscription payments to iFixIt remain in scope.

---

## 4. MVP Monetization

Primary initial monetization:

`Provider Subscription → Marketplace Eligibility / Lead Access`

Rules:
- Payment alone never means provider approval.
- Approval alone does not bypass subscription requirements when subscription is required.
- Suspension overrides subscription status for new marketplace exposure.

Future monetization options may include commission, promoted listings, customer transaction fees, or premium business tools, but they are not MVP requirements unless separately approved.

---

## 5. Simplified Provider MVP Workflow

The operational provider workflow should minimize data-entry burden.

Core required actions:

`Receive → Accept/Decline → Contact/Schedule → Inspect if required → Quote if required → Start → Complete`

Minimum completion information:
- completion note
- completion timestamp
- final customer-visible status
- final amount context where relevant
- essential evidence where policy requires it

Optional/conditional MVP details:
- detailed parts lines
- detailed labour hours
- multiple progress updates
- internal notes
- before/during/after photos
- supplier data
- part serial/reference data

These features remain supported by the design but should not make ordinary small repairs unnecessarily difficult to close.

---

## 6. Launch Scope

MVP must support **configurable locations and categories**, but launch operations should start narrowly.

Recommended initial operating scope:
- selected high-demand Maldives locations
- selected high-demand repair categories

Example launch candidate:
- Malé
- Hulhumalé

Example initial categories:
- Air Conditioning
- Electrical
- Plumbing
- Appliances

Important:
- These examples are launch recommendations, not hard-coded system limits.
- Admin must be able to activate additional locations/categories through data/configuration without normal code changes.

---

## 7. Local Island Matching — Approved MVP Rule

Geographic matching is **local-first and island-aware**.

Authoritative location rules:
- Every atoll and island must be represented by canonical master-data IDs.
- Free-text island names must never be used as the authoritative equality/matching key.
- Each repair request must store canonical `service_atoll_id` and `service_island_id`.
- Provider legal registration location must be stored separately from operational base and approved service areas.
- Exact same-island operational-base providers receive the highest geographic priority.
- Providers based elsewhere but explicitly approved to serve the target island form the next fallback tier.
- Same-atoll cross-island expansion may occur only when configured/allowed.
- Cross-atoll dispatch must never occur silently and requires configured permission, customer authorization where applicable, or administrative authorization.
- Straight-line GPS radius is supplementary only; it must not replace island identity or transport-feasibility rules.
- Matching-stage expansion and manual geographic overrides must be auditable.
- Direct Provider Booking must still pass exact service and geographic eligibility rules.
- If a direct provider declines or times out, iFixIt must ask the customer before broadening to Smart Matching.

Authoritative detailed specification:

[`LOCAL_ISLAND_MATCHING_AND_LOCATION_ARCHITECTURE.md`](LOCAL_ISLAND_MATCHING_AND_LOCATION_ARCHITECTURE.md)

If an older document refers only to a generic `location match`, the local-island architecture above takes precedence.

---

## 8. MVP vs Later Phases

### MVP — Required
- customer authentication/profile
- provider onboarding
- provider verification/admin approval
- repair catalogue
- canonical atoll/island location master
- provider operational base and normalized service areas
- provider search
- Direct Provider Booking
- Smart Matching
- local-first same-island matching and controlled fallback
- matching-attempt audit
- repair request with photos
- accept/decline
- scheduling/contact
- inspection when required
- simple quotation and approval when required
- fixed-price workflow
- repair status/tracking
- completion/customer confirmation
- reviews
- basic complaints/disputes
- provider subscription/payment
- notifications
- admin operations
- essential reporting
- audit trail

### Phase 2 — Advanced Operations
- business-provider staff hierarchy
- richer scheduling/calendar engine
- SLA monitoring/escalation
- provider performance scoring
- advanced fraud/risk controls
- maps/routing/ETA
- offline technician workflows
- advanced warranty operations
- richer analytics/reporting
- advanced parts/inventory functions
- detailed transport schedules/travel-time intelligence

### Phase 3 — Intelligent/AI Features
- AI-assisted service selection
- AI-assisted diagnosis suggestions
- AI quotation anomaly checks
- predictive maintenance
- intelligent routing optimization
- AI support assistant

---

## 9. Authoritative Workflow Rules

### Fixed Price

`Customer → Service → Provider/Matching → Booking → Acceptance → Schedule → Service → Completion → Review`

### Diagnosis Required

`Customer → Problem Request → Provider/Matching → Acceptance → Inspection → Diagnosis → Quote → Customer Approval → Repair → Completion → Review/Warranty`

### Direct Provider Decline/Timeout

`Direct Request → Declined/Expired → Ask Customer → Broaden to Smart Matching OR Cancel/Choose Another Provider`

### Local-First Smart Matching

`Canonical Service Island → Exact Local Operational-Base Providers → Target-Island Service-Area Providers → Same-Atoll Fallback if Allowed → Cross-Atoll/Special Dispatch if Explicitly Allowed → Manual Review/No Provider`

---

## 10. Cross-Document Precedence

This file is the approved MVP business-model baseline.

`LOCAL_ISLAND_MATCHING_AND_LOCATION_ARCHITECTURE.md` is the approved detailed geographic-matching baseline.

If an earlier requirement, wireframe, use case, database note, API note, state machine, or test assumption conflicts with the decisions in these approved baseline documents, the baseline documents take precedence until that source document is synchronized.

Affected documents include:
- `SYSTEM_REQUIREMENTS_AND_USE_CASES.md`
- `STEP_1_USER_FLOW_AND_ARCHITECTURE.md`
- `STEP_2_DESIGN_AND_TECH_APPROACH.md`
- `STEP_3_DETAILED_USE_CASES_AND_BUSINESS_RULES.md`
- `STEP_3_USE_CASE_HIERARCHY.md`
- `STEP_4_FINAL_UI_AND_SCREEN_SPECIFICATION.md`
- `STEP_5_FUNCTIONAL_SPECIFICATION_FREEZE.md`
- `STEP_6_DATABASE_SCHEMA_AND_DATA_DICTIONARY.md`
- `STEP_7_API_CONTRACTS.md`
- `STEP_8_ROLES_AND_PERMISSION_MATRIX.md`
- `STEP_9_FORMAL_STATE_TRANSITION_MATRICES.md`
- `STEP_10_TEST_CASES_AND_ACCEPTANCE_CRITERIA.md`

---

## 11. Validation Gate Before Production Build

These decisions are approved as the working MVP baseline, but market validation should still confirm:
- customers want Direct Booking, Smart Matching, or both
- providers will actively respond to digital requests
- fixed-price services are practical for selected categories
- providers will use the simplified workflow
- proposed subscription pricing is acceptable
- initial launch locations/categories have sufficient supply and demand
- providers accept the proposed local-first/fallback dispatch model
- cross-island travel and notice rules are operationally realistic

The implementation architecture must remain flexible enough to adjust these configuration-level choices without a redesign.

---

## 12. Approval Record

- [x] Direct Provider Booking approved
- [x] Smart Matching approved
- [x] FIXED_PRICE service workflow approved
- [x] DIAGNOSIS_REQUIRED workflow approved
- [x] Customer repair payment excluded from MVP
- [x] Provider subscriptions retained as MVP monetization
- [x] Simplified provider operational workflow approved
- [x] Narrow/configurable launch scope approved
- [x] Canonical atoll/island IDs approved
- [x] Registered location separated from operational base/service areas
- [x] Same-island operational-base priority approved
- [x] Controlled same-atoll fallback approved
- [x] Explicit/audited cross-atoll dispatch approved
- [x] Matching-attempt audit approved
- [x] Advanced operations deferred to Phase 2
- [x] AI/intelligent features deferred to Phase 3

**Decision:** This document is now the working MVP business-model source of truth for iFixIt, together with `LOCAL_ISLAND_MATCHING_AND_LOCATION_ARCHITECTURE.md` for geographic matching.