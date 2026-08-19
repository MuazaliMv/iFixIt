# iFixIt — Step 7: API Contracts

**Document Type:** REST API Specification  
**Status:** Synchronized Implementation Baseline  
**Version:** 2.0  
**Date:** 2026-08-19

---

## 1. API Principles

- REST/JSON over HTTPS.
- Version base path: `/api/v1`.
- Server is authoritative for permissions, totals, state transitions, ownership and provider eligibility.
- UUIDs are internal resource identifiers; public ticket/job/reference numbers are display/search identifiers.
- Critical writes use idempotency.
- Unbounded lists use pagination.
- Private verification, complaint, payment-instruction and security data are never exposed through public projections.
- Canonical `atoll_id` and `island_id` are used for geography; free-text island matching is forbidden.
- Direct Booking must never silently broaden to another provider or Smart Matching.
- Customer repair-payment acknowledgement and provider subscription payments are separate API domains.

This contract is synchronized with migrations `0001`–`0006`, `docs/api/API_CATALOGUE.md`, the approved MVP baseline and the Maldives local-island architecture.

---

## 2. Standard Response Shapes

Success:

```json
{
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "This action is not allowed in the current state.",
    "details": {},
    "correlation_id": "..."
  }
}
```

List:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "page_size": 25,
    "total": 0
  }
}
```

---

## 3. Authentication & Sessions

### `POST /auth/otp/request`
Public. Requests an OTP challenge for a normalized phone number.

### `POST /auth/otp/verify`
Public with challenge. Verifies OTP and creates/returns authenticated session state.

### `POST /auth/logout`
Authenticated. Revokes current session.

### `POST /auth/refresh`
Authenticated by valid refresh credential. Rotates/refreshes session according to server policy.

### `POST /auth/phone-change/request`
Authenticated. Starts verified phone change.

### `POST /auth/phone-change/verify`
Authenticated. Confirms new phone with OTP.

All OTP endpoints require rate limiting, challenge expiry, attempt limits and replay protection.

---

## 4. Current User / Customer Profile

### `GET /me`
Returns authenticated user summary and effective roles.

### `PATCH /me`
Updates allowed user profile fields only.

### `GET /me/roles`
Returns server-authoritative effective roles/permissions where appropriate for UI initialization.

Protected phone change is performed only through the phone-change OTP endpoints.

A separate `customer_profiles` resource is not required by the current data model.

---

## 5. Canonical Maldives Geography

### `GET /atolls`
Public canonical active/serviceable atolls.

### `GET /atolls/{atoll_id}`
Public atoll detail.

### `GET /islands?atoll_id=&serviceable=true&q=`
Public canonical islands filtered by atoll/serviceability/search.

### `GET /islands/{island_id}`
Public canonical island detail.

Island aliases may improve search results but returned/matched resources use canonical IDs.

The previous generic `/locations?parent_id=` contract is superseded for marketplace matching.

---

## 6. Public Service Catalogue

### `GET /service-categories`
### `GET /service-subcategories?category_id=`
### `GET /repair-services?subcategory_id=&q=`
### `GET /repair-services/{service_id}`

Catalogue responses expose active/public fields only.

---

## 7. Provider Search & Public Profiles

### `GET /providers/search?service_id=&island_id=&availability=&rating=&provider_type=&page=`

Search must use exact service and canonical island IDs. Hard eligibility is checked before ranking.

### `GET /providers/{provider_id}`
Public provider projection.

### `GET /providers/{provider_id}/reviews`
Public published verified-review projection once implemented.

### `POST /providers/{provider_id}/favourite`
Customer. Planned customer convenience feature.

### `DELETE /providers/{provider_id}/favourite`
Customer. Planned customer convenience feature.

Public Call/WhatsApp actions are generated only where provider visibility/settings allow them.

---

## 8. Repair Requests

### `POST /repair-requests`
Customer. Creates a Direct Provider or Smart Matching request.

Final submission requires idempotency.

Payload uses:

- `booking_model`
- `requested_provider_id` only for Direct Booking
- exact `service_id`
- canonical `service_atoll_id` and `service_island_id`
- workflow/urgency/schedule/problem fields
- approved matching scope

### `GET /repair-requests/{id}`
Owner, assigned provider where relationship permits, or authorized admin.

### `GET /me/repair-requests`
Customer self.

### `PATCH /repair-requests/{id}`
Customer owner while current state remains editable.

### `POST /repair-requests/{id}/submit`
Customer owner. Validates service/geography and transitions to submitted/matching state.

### `POST /repair-requests/{id}/cancel`
Customer/admin as allowed by state/policy.

### `POST /repair-requests/{id}/media`
Customer owner. Associates controlled upload metadata; media implementation is extended in later migration/application work.

### `GET /repair-requests/{id}/timeline`
Authorized participant/admin.

---

## 9. Direct Booking Fallback

Direct Booking decline/expiry/ineligibility must produce a customer decision rather than silent reassignment.

### `GET /repair-requests/{id}/fallback-options`
Customer owner. Returns allowed choices based on current request state.

### `POST /repair-requests/{id}/fallback-decision`
Customer owner.

Allowed decisions include:

- convert to Smart Matching
- choose another provider
- cancel request

Decision is persisted/audited.

---

## 10. Provider Onboarding & Profile

### `POST /provider/profile`
Authenticated applicant.

### `GET /provider/profile`
Provider self.

### `PUT /provider/profile`
Provider self; protected review/status fields excluded.

### `PUT /provider/services`
Provider self. Updates exact service mappings.

### `PUT /provider/services/{provider_service_id}/pricing`
Provider self. Updates service-level pricing within policy.

### `PUT /provider/service-areas`
Provider self. Uses canonical atoll/island IDs.

### `PUT /provider/availability`
Provider self. Weekly availability/current status.

### `PUT /provider/availability/overrides`
Provider self. Date-specific override management.

### `POST /provider/application/submit`
Provider applicant. Validates prerequisites and submits for review.

---

## 11. Provider Verification

### `POST /provider/verifications`
Provider self. Creates verification/document submission metadata.

### `POST /provider/verifications/{id}/documents`
Provider self. Controlled private upload association.

### `GET /provider/verifications`
Provider self.

Admin:

### `GET /admin/verifications`
### `GET /admin/verifications/{id}`
### `POST /admin/verifications/{id}/approve`
### `POST /admin/verifications/{id}/request-information`
### `POST /admin/verifications/{id}/reject`

Administrative decisions require explicit permission and auditable reason where applicable.

---

## 12. Provider Approval & Administration

### `GET /admin/providers`
Filters may include approval/verification/marketplace/suspension/service/island state.

### `GET /admin/providers/{id}`
### `POST /admin/providers/{id}/approve`
### `POST /admin/providers/{id}/reject`
### `POST /admin/providers/{id}/suspend`
### `POST /admin/providers/{id}/reactivate`

Reactivation never bypasses current service, verification, geography or subscription eligibility.

---

## 13. Matching, Leads & Atomic Assignment

### `GET /provider/leads`
Provider self.

### `GET /provider/leads/{id}`
Provider self when target of lead.

### `POST /provider/leads/{id}/view`
Provider self. Records viewed state where needed.

### `POST /provider/leads/{id}/accept`
Provider self. Calls concurrency-safe acceptance logic. Revalidates:

- lead ownership/status/expiry
- provider hard eligibility
- exact service
- geographic tier/scope
- absence of another active assignment

### `POST /provider/leads/{id}/decline`
Provider self. Optional/configured decline reason.

Admin:

### `GET /admin/repair-requests/unassigned`
### `GET /admin/repair-requests/{id}/eligible-providers`
### `POST /admin/repair-requests/{id}/assign`
### `POST /admin/repair-requests/{id}/reassign`

Manual assignment/reassignment must validate current eligibility and create audit/history.

---

## 14. Jobs — Implemented Foundation

### `GET /provider/jobs`
Provider self.

### `GET /me/jobs`
Customer self.

### `GET /jobs/{id}`
Authorized customer/provider/admin.

### `GET /jobs/{id}/timeline`
Authorized participant/admin.

### `POST /jobs/{id}/schedule`
Authorized provider/admin subject to lifecycle rules.

### `POST /jobs/{id}/reschedule`
Authorized provider/admin subject to lifecycle rules/history.

### `POST /jobs/{id}/progress`
Provider. Appends customer-visible/private progress event.

### `POST /jobs/{id}/start`
Provider. Requires all workflow prerequisites.

### `POST /jobs/{id}/waiting-for-parts`
Provider.

### `POST /jobs/{id}/hold`
Provider/admin as permitted.

### `POST /jobs/{id}/resume`
Provider.

All job transitions must be validated against the current canonical state machine.

For `DIAGNOSIS_REQUIRED`, the start-repair API must reject any attempt to bypass required inspection/diagnosis and approval of the current quotation version. Migration 0007 must enforce this at the data/service layer as well.

---

## 15. Inspections — Planned Migration 0007

### `POST /jobs/{id}/inspection/schedule`
### `POST /jobs/{id}/inspection/start`
### `PUT /jobs/{id}/inspection/diagnosis`
### `POST /jobs/{id}/inspection/complete`

Each transition validates job workflow, current state and provider relationship.

---

## 16. Versioned Quotations — Planned Migration 0007

### `POST /jobs/{id}/quotations`
Provider assigned to job. Creates initial draft/version.

### `GET /jobs/{id}/quotation`
Authorized customer/provider/admin.

### `GET /quotations/{id}/versions`
Authorized participant/admin.

### `PUT /quotations/{id}/draft`
Provider; current editable draft only.

### `POST /quotations/{id}/submit`
Provider. Server recalculates totals and preserves submitted version.

### `POST /quotations/{id}/approve`
Customer owner only; current unexpired submitted version only.

### `POST /quotations/{id}/reject`
Customer owner.

### `POST /quotations/{id}/revise`
Provider. Creates a new version and preserves prior version.

Approval of version N never approves version N+1.

---

## 17. Parts, Labour & Completion — Planned/Extended in 0007

### `POST /jobs/{id}/parts`
### `PATCH /jobs/{id}/parts/{part_id}`
### `DELETE /jobs/{id}/parts/{part_id}`

### `POST /jobs/{id}/labour`
### `PATCH /jobs/{id}/labour/{labour_id}`

### `POST /jobs/{id}/complete`
Provider. Validates completion prerequisites/evidence.

### `POST /jobs/{id}/confirm-completion`
Customer owner.

### `POST /jobs/{id}/dispute-completion`
Customer owner; creates/links complaint workflow.

Finalized history must not be silently destructively edited.

---

## 18. Off-Platform Repair Payment Acknowledgement — Planned Migration 0008

These APIs record declarations/evidence only. They do **not** represent iFixIt processing customer repair funds.

### `GET /jobs/{id}/payment-methods`
Customer participant. Returns provider-permitted protected payment instructions for the active relationship.

### `POST /jobs/{id}/payment-acknowledgements/customer-paid`
Customer owner. Records `I Have Paid` declaration.

### `POST /jobs/{id}/payment-acknowledgements/provider-received`
Assigned provider. Records independent `Payment Received` declaration.

### `GET /jobs/{id}/payment-acknowledgement`
Authorized participants/admin.

### `POST /jobs/{id}/payment-evidence`
Authorized participant; controlled private evidence association.

### `POST /jobs/{id}/payment-issue`
Authorized participant; opens/links payment disagreement/complaint workflow.

Admin may inspect/reconcile records but cannot reverse money that iFixIt never held.

---

## 19. Reviews — Planned Migration 0009

The synchronized MVP rating model uses four dimensions: Quality, Punctuality, Communication and Value for Money.

### `POST /jobs/{id}/review`
Customer owner. One verified review per eligible finalized job.

### `GET /me/reviews`
Customer self.

### `PATCH /reviews/{id}`
Review owner within configured policy window.

### `DELETE /reviews/{id}`
Policy-controlled logical removal/request; historical/moderation integrity preserved.

### `POST /reviews/{id}/response`
Provider related to review.

### `PATCH /reviews/{id}/response`
Provider where policy permits.

### `POST /reviews/{id}/flag`
Authorized user.

Admin:

### `POST /admin/reviews/{id}/moderate`
### `POST /admin/reviews/{id}/hide`
### `POST /admin/reviews/{id}/restore`

Reason/audit required for moderation decisions.

---

## 20. Complaints — Planned Migration 0009

### `POST /complaints`
Customer/provider.

### `GET /me/complaints`
Current user's complaints.

### `GET /complaints/{id}`
Authorized participant/admin.

### `POST /complaints/{id}/evidence`
Authorized participant.

### `POST /complaints/{id}/updates`
Optional structured support/case update endpoint; not full live chat.

Admin:

### `GET /admin/complaints`
### `POST /admin/complaints/{id}/assign`
### `POST /admin/complaints/{id}/request-customer-info`
### `POST /admin/complaints/{id}/request-provider-info`
### `POST /admin/complaints/{id}/escalate`
### `POST /admin/complaints/{id}/resolve`
### `POST /admin/complaints/{id}/reject`

---

## 21. Warranty — Planned

### `GET /me/warranties`
### `GET /warranties/{id}`
### `POST /warranties/{id}/claims`
### `GET /provider/warranty-claims`
### `POST /warranty-claims/{id}/respond`

Admin:

### `GET /admin/warranty-claims`
### `POST /admin/warranty-claims/{id}/resolve`

---

## 22. Provider Subscriptions & Platform Payments — Planned Migration 0010

### `GET /subscription-plans`
### `GET /provider/subscription`
### `POST /provider/subscription/select-plan`
### `POST /provider/subscription/renew`
### `POST /provider/subscription/cancel`

Subscription payment APIs:

### `POST /payments/subscription/initiate`
Provider. Server calculates authoritative amount.

### `GET /payments/subscription/{id}`
Owner/admin.

### `GET /payments/subscription/{id}/status`
Owner/admin.

### `POST /webhooks/payments/{gateway}`
Gateway callback. Signature validation and event idempotency mandatory.

Browser return URLs never mark payment successful.

Admin:

### `GET /admin/subscriptions`
### `POST /admin/subscriptions/{id}/extend`
### `GET /admin/subscription-payments`
### `POST /admin/subscription-payments/{id}/reconcile`

These APIs are distinct from repair-payment acknowledgements in Section 18.

---

## 23. Promotions — Planned Migration 0010

### `GET /provider/promotion`
Provider self. Current campaign/enrollment/timeline.

### `POST /provider/promotion/acknowledge`
Provider self. Records required pricing acknowledgement where policy requires it.

Admin campaign configuration endpoints may manage promotion stages, eligibility and Founding Provider settings.

No UI/API may display fake scarcity or misleading savings.

---

## 24. Notifications — Planned Migration 0009/Application Integration

### `GET /me/notifications`
### `POST /me/notifications/{id}/read`
### `PUT /me/notification-preferences`

Notification creation is domain-event driven; there is no general public "send notification" API.

Delivery failure must not roll back the source business transaction.

---

## 25. Admin Master Data

Services:

### `POST /admin/service-categories`
### `PATCH /admin/service-categories/{id}`
### `POST /admin/service-subcategories`
### `PATCH /admin/service-subcategories/{id}`
### `POST /admin/repair-services`
### `PATCH /admin/repair-services/{id}`
### `POST /admin/repair-services/{id}/archive`

Canonical geography:

### `POST /admin/atolls`
### `PATCH /admin/atolls/{id}`
### `POST /admin/islands`
### `PATCH /admin/islands/{id}`
### `POST /admin/islands/{id}/disable`
### `POST /admin/island-aliases`

Primary canonical IDs are immutable. Historical references remain valid when a location is disabled for new marketplace activity.

Plans/promotions are added in Migration 0010.

---

## 26. Admin Operations & Reporting — Planned Migration 0011

### `GET /admin/dashboard`
### `GET /admin/jobs`
### `GET /admin/jobs/{id}`
### `POST /admin/jobs/{id}/correct-state`
High privilege; reason/audit required.

Reports:

### `GET /admin/reports/repairs`
### `GET /admin/reports/providers`
### `GET /admin/reports/quotations`
### `GET /admin/reports/subscriptions`
### `GET /admin/reports/supply-demand`
### `GET /admin/reports/geography`

Audit:

### `GET /admin/audit-events`
Read-only to authorized roles.

---

## 27. Authorization & Ownership Rules

Every protected endpoint validates all applicable dimensions:

1. authenticated identity
2. account active state
3. role
4. explicit permission where required
5. resource ownership/relationship
6. current entity state
7. provider eligibility when action concerns marketplace work
8. canonical geographic eligibility where relevant
9. subscription entitlement where/when the feature requires it

Changing a URL/UUID must never allow horizontal privilege escalation.

---

## 28. Idempotency Requirements

Idempotency is required/recommended for:

- repair request final submission
- lead acceptance
- assignment creation/reassignment
- quotation submission/approval
- job completion/finalization
- customer/provider payment acknowledgements
- subscription payment initiation
- payment webhooks
- review submission
- sensitive admin corrections

Duplicate requests return the original logical result where safe rather than creating duplicate business entities.

---

## 29. HTTP Status Guidance

- `200` successful read/update
- `201` created
- `202` accepted for asynchronous work
- `204` successful no-content action
- `400` invalid input
- `401` unauthenticated
- `403` authenticated but unauthorized
- `404` resource not found/not visible
- `409` state/concurrency/idempotency conflict
- `422` business validation failure
- `429` rate limited
- `500` unexpected server error
- `503` dependency temporarily unavailable

---

## 30. Synchronization Result

Version 2.0 supersedes the older API assumptions that used generic `location_id`/`/locations`, a separate customer-profile resource as identity authority, generic customer/provider payment endpoints, and incomplete complaint/review/off-platform-payment coverage.

For implementation, use this contract together with `docs/api/API_CATALOGUE.md` and the committed migration chain.