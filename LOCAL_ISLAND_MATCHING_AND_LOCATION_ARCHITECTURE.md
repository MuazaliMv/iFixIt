# iFixIt — Local Island Matching & Location Architecture

**Status:** APPROVED IMPLEMENTATION BASELINE  
**Date:** 2026-08-19  
**Scope:** Maldives location master data, provider service geography, same-island matching, fallback dispatch, validation, audit and analytics.

---

## 1. Purpose

iFixIt operates in a geography where an apparently short GPS distance may cross water and require separate transport. Location therefore cannot be treated as a generic radius search.

The authoritative matching principle is:

> For every repair request, iFixIt shall identify the target island using a canonical island ID. The matching engine shall first search for eligible providers whose active operational base is on the target island and who support the exact requested service. If none are available, the engine may expand to providers explicitly approved to service that island, followed by same-atoll providers where cross-island dispatch is permitted. Cross-atoll matching shall only occur according to configured fallback rules or administrative authorization. Free-text island names shall never be used as the authoritative matching key.

This document is the source of truth for geographic matching. If older generic references to `location` in Steps 1–10 conflict with this document, this document takes precedence until those documents are synchronized.

---

## 2. Location Model

### 2.1 Canonical hierarchy

```text
Country
  ↓
Atoll
  ↓
Island
  ↓
Optional service zone / address
  ↓
Optional GPS coordinates
```

Each atoll and island must have an immutable internal identifier. Display names are labels, not matching keys.

Example:

```text
country_code: MV
atoll_id: <internal immutable ID>
island_id: <internal immutable ID>
display_name: Hulhumalé
```

### 2.2 No free-text authority

The backend must never determine island equality by comparing user-entered island names.

Incorrect:

```sql
WHERE island_name = 'Hulhumale'
```

Required:

```sql
WHERE island_id = :service_island_id
```

Search aliases may exist for spelling/diacritic variations, but every alias must resolve to one canonical island record.

---

## 3. Customer Service Location

Every repair request must identify the exact service island.

Required authoritative fields:
- `service_atoll_id`
- `service_island_id`
- `service_address` or structured address/location detail appropriate to the island

Recommended/conditional fields:
- `service_latitude`
- `service_longitude`
- `location_notes`
- `access_instructions`

`service_island_id` controls geographic matching.

GPS is supplementary evidence for fine-distance calculations and validation; GPS alone must not replace canonical island identity.

---

## 4. Provider Location Concepts

Provider geography must separate legal registration from actual operating geography.

### 4.1 Registered island
`registered_island_id`

Purpose:
- legal/business verification
- registration records
- compliance/reference

It must not by itself determine dispatch priority.

### 4.2 Operational base island
`physical_base_island_id` or equivalent normalized provider-location record

Purpose:
- identifies where a provider/team is physically stationed
- determines strongest local-priority signal

### 4.3 Approved service areas
A provider may serve one or more islands through normalized `provider_service_areas` records.

Purpose:
- geographic eligibility
- support branches/mobile teams
- permit providers based elsewhere to legitimately serve a target island

Do not store service islands as comma-separated text.

---

## 5. Provider Geographic Tiers

Eligible providers are classified into geographic tiers before non-geographic ranking.

### Tier 0 — Exact local operational base

```text
provider operational_base_island_id
=
request service_island_id
```

Highest geographic priority.

### Tier 1 — Explicit target-island service area
Provider is based elsewhere but has an active, approved service-area record for the target island.

### Tier 2 — Same-atoll fallback
Provider is not already eligible under Tier 0/1, but:
- provider is within the same atoll under configured operational rules
- cross-island dispatch is allowed
- provider is willing/eligible to travel
- fallback policy permits expansion

### Tier 3 — Cross-atoll / special dispatch
Used only where configured, customer-authorized where required, or administratively authorized.

This tier should not be entered silently.

---

## 6. Core Provider Eligibility

Before a provider can be ranked or surfaced for a request, all mandatory eligibility controls must pass.

```text
provider.status = ACTIVE
AND provider.verification_status = APPROVED
AND provider.can_receive_jobs = TRUE
AND provider supports exact requested service
AND provider is not suspended
AND provider subscription is eligible when required
AND provider availability permits assignment
AND geographic tier is permitted by matching scope/fallback policy
```

Direct Provider Booking does not bypass these rules.

---

## 7. Same-Island Matching Workflow

```text
Repair Request Submitted
        ↓
Resolve canonical service_island_id
        ↓
Resolve exact repair_service_id
        ↓
Apply non-geographic eligibility rules
        ↓
Find Tier 0 providers on exact island
        ↓
Any eligible/available Tier 0 provider?
   ┌──────────────┴──────────────┐
  YES                            NO
   ↓                              ↓
Rank local providers        Evaluate Tier 1
   ↓                              ↓
Offer/assign                  Continue controlled fallback
```

### 7.1 Tier 0 ranking
Within same-island eligible providers, ranking may consider:
1. exact operational-base island match
2. exact service capability
3. current availability
4. fine-distance from request where GPS is valid
5. response/acceptance performance
6. rating/quality signals
7. current workload/capacity
8. fairness/last-assignment policy

Geographic eligibility and safety controls must never be overridden by a higher rating or commercial ranking signal.

---

## 8. Controlled Fallback Policy

The search must not silently broaden geography.

Recommended stages:

```text
Stage 1 — Tier 0: exact same-island operational base
        ↓ none available
Stage 2 — Tier 1: explicitly approved to serve target island
        ↓ none available
Stage 3 — Tier 2: same-atoll cross-island fallback
        ↓ none available
Stage 4 — Tier 3: cross-atoll / special dispatch
        ↓
Manual review or customer notification when required
```

Every expansion stage must be recorded in the matching audit trail.

### 8.1 Matching scope
Recommended request/policy values:

```text
LOCAL_ONLY
TARGET_ISLAND_SERVICE_AREA_ALLOWED
SAME_ATOLL_ALLOWED
CROSS_ATOLL_ALLOWED
```

The application may expose a simpler customer-facing choice while retaining these values internally.

### 8.2 Direct booking fallback
For Direct Provider Booking:

```text
Selected Provider Declines/Times Out
        ↓
Do not silently reassign
        ↓
Ask Customer
        ↓
Choose Another Provider
OR Convert to Smart Matching
OR Cancel
```

If converted to Smart Matching, the normal geographic fallback policy applies.

---

## 9. Maldives-Specific Dispatch Rules

Straight-line radius must not be the primary geographic expansion mechanism because distance across water does not reliably represent dispatch feasibility.

Fallback should consider:
- island relationship
- atoll relationship
- provider's approved service area
- cross-island dispatch permission
- transport feasibility
- provider willingness
- required notice
- travel fee where configured
- minimum job value where configured

Architecture-ready provider service-area fields may include:
- `cross_island_dispatch_allowed`
- `travel_fee`
- `minimum_notice_hours`
- `minimum_job_value`
- `transport_required`
- `effective_from`
- `effective_to`

These controls may be operationally simplified in MVP, but the data model must not block them.

---

## 10. Required Data Model

### 10.1 `atolls`

Recommended fields:
- `id` — immutable primary key
- `code` — official/reference code where available
- `official_name`
- `display_name`
- `is_active`
- `created_at`
- `updated_at`

### 10.2 `islands`

Recommended fields:
- `id` — immutable primary key
- `atoll_id` — foreign key to `atolls.id`
- `canonical_name`
- `display_name`
- `official_or_reference_code` where available
- `latitude` — representative centroid/reference point, nullable
- `longitude` — representative centroid/reference point, nullable
- `is_inhabited`
- `is_serviceable`
- `is_active`
- `created_at`
- `updated_at`

Unique constraints should prevent duplicate canonical/reference identities within the intended scope.

### 10.3 `island_aliases`

Recommended fields:
- `id`
- `island_id`
- `alias`
- `normalized_alias`
- `locale` nullable
- `is_active`

Purpose: search convenience only. Aliases must resolve to canonical `island_id`.

### 10.4 `provider_locations`

Recommended fields:
- `id`
- `provider_id`
- `location_type`
- `island_id`
- `address`
- `latitude`
- `longitude`
- `is_primary`
- `status`
- `valid_from`
- `valid_to`
- `created_at`
- `updated_at`

Suggested `location_type` values:

```text
REGISTERED_ADDRESS
OPERATIONAL_BASE
BRANCH
TEMPORARY_BASE
```

A provider must not have conflicting active primary operational-base records unless the provider architecture explicitly supports multiple dispatch teams/branches.

### 10.5 `provider_service_areas`

Recommended fields:
- `id`
- `provider_id`
- `island_id`
- `service_status`
- `cross_island_required`
- `cross_island_dispatch_allowed`
- `travel_fee` nullable
- `minimum_notice_hours` nullable
- `minimum_job_value` nullable
- `transport_required` nullable/boolean
- `approved_by` nullable
- `approved_at` nullable
- `effective_from`
- `effective_to` nullable
- `created_at`
- `updated_at`

Recommended uniqueness:

```text
(provider_id, island_id, active/effective service-area identity)
```

### 10.6 `repair_requests` location additions

Required/authoritative:
- `service_atoll_id`
- `service_island_id`
- `service_address`

Recommended:
- `service_latitude`
- `service_longitude`
- `location_notes`
- `matching_scope`
- `fallback_allowed`

Historical repair requests must retain stable island references even if an island is later disabled for new marketplace activity.

### 10.7 `matching_attempts`

Recommended fields:
- `id`
- `repair_request_id`
- `matching_stage`
- `target_atoll_id`
- `target_island_id`
- `eligible_provider_count`
- `selected_provider_id` nullable
- `failure_reason` nullable
- `algorithm_version`
- `created_at`

This table supports traceability, debugging, supply/demand reporting, fairness review and future algorithm analysis.

---

## 11. Validation Rules

### 11.1 Request location
Reject or block submission when:
- `service_island_id` does not exist
- island is inactive for new marketplace requests
- island is not serviceable
- selected atoll does not correspond to selected island

### 11.2 GPS consistency
When reliable GPS is supplied, validate it against the selected island using a configured island boundary/polygon or reasonable geographic validation method when such data exists.

If the selected island and GPS are materially inconsistent, return a location mismatch requiring correction or confirmation according to policy.

GPS inconsistency must not automatically rewrite the canonical island without explicit resolution.

### 11.3 Provider service-area validation
A provider service-area record must reference an existing canonical island and must be effective/active before it can make the provider geographically eligible.

### 11.4 Similar/shared island names
UI selectors must display enough context to disambiguate an island, normally:

```text
Island Name — Atoll Name
```

The UI stores the selected canonical ID, never the typed label.

---

## 12. Matching Engine Logic

Conceptual algorithm:

```text
INPUT:
  repair_service_id
  service_island_id
  requested_time
  matching_scope

1. Load canonical island + atoll.
2. Validate serviceability.
3. Load providers passing account, verification, service, subscription,
   suspension and availability controls.
4. Classify candidates:
   A = active operational base on target island
   B = active approved service area includes target island
   C = same-atoll fallback and cross-island eligible
   D = cross-atoll/special-dispatch eligible
5. If A exists:
      rank A and dispatch/offer according to matching policy.
6. Else if B exists:
      rank B and dispatch/offer.
7. Else if matching_scope permits same-atoll:
      rank C; disclose travel implications where required.
8. Else if matching_scope permits special/cross-atoll:
      rank D or send to admin dispatch queue.
9. Else:
      mark NO_LOCAL_PROVIDER_AVAILABLE.
10. Record each matching stage and decision.
```

Concurrency rules from the core blueprint continue to apply: only one provider may gain exclusive ownership of a job/assignment where the workflow requires exclusivity.

---

## 13. API Requirements

The API contract must expose canonical IDs, not rely on labels.

Recommended endpoints/resources:

```text
GET  /locations/atolls
GET  /locations/islands?atoll_id=...
GET  /locations/islands/{island_id}
GET  /locations/search?q=...
GET  /providers/{provider_id}/locations
GET  /providers/{provider_id}/service-areas
POST /providers/{provider_id}/service-areas
PATCH /providers/{provider_id}/service-areas/{id}
POST /repair-requests
POST /repair-requests/{id}/match
GET  /repair-requests/{id}/matching-attempts   [authorized/admin as appropriate]
```

Repair-request creation must validate that `service_island_id` belongs to the supplied `service_atoll_id` if both are supplied.

Matching responses should include internal reason/stage metadata for authorized operational/admin consumers, while customer-facing responses should remain simple.

Recommended machine-readable errors:

```text
INVALID_ISLAND
ISLAND_NOT_SERVICEABLE
ATOLL_ISLAND_MISMATCH
LOCATION_MISMATCH
NO_LOCAL_PROVIDER_AVAILABLE
NO_PROVIDER_IN_ALLOWED_FALLBACK_SCOPE
CROSS_ISLAND_DISPATCH_NOT_ALLOWED
CROSS_ATOLL_DISPATCH_REQUIRES_AUTHORIZATION
```

---

## 14. Matching / Dispatch State Rules

Geographic matching should be represented by auditable events rather than silently mutating a request.

Suggested matching-stage values:

```text
LOCAL_EXACT
TARGET_ISLAND_SERVICE_AREA
SAME_ATOLL_FALLBACK
CROSS_ATOLL_SPECIAL
MANUAL_DISPATCH
MATCH_FAILED
```

Suggested failure/reason values:

```text
NO_ELIGIBLE_PROVIDER
NO_AVAILABLE_PROVIDER
PROVIDER_DECLINED
OFFER_EXPIRED
FALLBACK_NOT_ALLOWED
TRANSPORT_NOT_FEASIBLE
ADMIN_REVIEW_REQUIRED
```

A request may remain `AWAITING_ASSIGNMENT` while the matching stage changes. Matching-stage history must not be confused with the primary repair-request lifecycle state.

---

## 15. Audit Requirements

Audit at minimum:
- request island selected/changed
- admin correction of service island
- provider operational-base changes
- provider service-area additions/removals/approval
- matching-stage expansion
- manual assignment/reassignment
- cross-atoll authorization
- algorithm version used for automated matching

High-risk geographic overrides require actor, timestamp, previous value, new value and reason.

---

## 16. Reporting & Analytics

The location/matching model must support:
- requests by island and atoll
- eligible providers by island/service
- same-island match rate
- Tier 1 fallback rate
- same-atoll fallback rate
- cross-atoll dispatch rate
- no-provider rate
- average assignment time by island/service
- provider acceptance rate by island/service
- high-demand/low-supply islands
- services repeatedly requiring external dispatch

Example operational insight:

```text
Island: Hulhumalé
Service: AC Not Cooling
Requests: 120
Eligible local providers: 8
Same-island assignments: 91
Fallback assignments: 15
Unassigned: 14
Result: HIGH DEMAND / LOW SUPPLY
```

---

## 17. Security & Privacy

- Exact home/service addresses must not be exposed in public provider search results.
- Customer precise location should only be shown to providers when workflow/assignment rules permit it.
- Provider legal registered address may be more restricted than public operating-area information.
- Location access must follow existing role/ownership permissions.
- Public marketplace views should normally expose island/service-area information, not private residential coordinates.

---

## 18. MVP Rules vs Future Enhancements

### MVP required
- canonical atoll and island masters
- canonical island IDs on repair requests
- provider operational-base island
- normalized provider service areas
- exact same-island priority
- controlled target-island/same-atoll fallback
- explicit cross-atoll control
- matching-attempt audit
- admin visibility into failed matching

### Architecture-ready / later enhancement
- detailed ferry/transport schedules
- travel-time prediction
- island polygons/geofencing
- multi-team dispatch bases
- dynamic travel pricing
- route optimization
- cross-island capacity forecasting

---

## 19. Acceptance Criteria

The location/matching implementation is not accepted unless all of the following pass:

- [ ] Island matching uses canonical IDs, not free-text equality.
- [ ] Atoll/island relationship is validated.
- [ ] Provider registered address is not incorrectly used as sole dispatch location.
- [ ] Exact operational-base island providers receive Tier 0 priority.
- [ ] Providers serving the target island from another base are distinguished from exact-local providers.
- [ ] Same-atoll expansion occurs only when policy allows it.
- [ ] Cross-atoll expansion never occurs silently.
- [ ] Direct Provider Booking still enforces geographic eligibility.
- [ ] Direct booking decline/timeout does not silently redistribute without customer consent.
- [ ] Disabled/non-serviceable islands cannot receive new requests.
- [ ] Historical records retain island identity after master-data changes.
- [ ] GPS mismatch does not silently overwrite island identity.
- [ ] Matching attempts record stage, candidate count, result and algorithm version.
- [ ] Admin manual geographic override is permission-controlled and audited.
- [ ] Supply/demand reports can aggregate by canonical island and exact service.

---

## 20. Cross-Document Impact

This approved architecture refines and governs the geographic portions of:
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

Developers must implement geographic matching from this document when older documents use a generic `location match` statement.

**Decision:** Local-first, canonical-island matching is an approved iFixIt MVP requirement.