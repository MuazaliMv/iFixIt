# iFixIt — Consolidated API Catalogue

**Base path:** `/api/v1`  
**Style:** REST/JSON over HTTPS  
**Status:** Implementation-facing API catalogue  
**Date:** 2026-08-19

This document consolidates the API surface currently defined across the iFixIt specification set. `STEP_7_API_CONTRACTS.md` remains the detailed contract baseline; this file is the easier implementation/index view and should be updated as migrations `0006`–`0012` are completed.

## Core API Rules

- Server-side authorization is authoritative; UI visibility is never a permission boundary.
- UUIDs are the canonical resource identifiers; public ticket/job numbers are display/search references only.
- Critical write operations use idempotency where appropriate.
- Unbounded collections are paginated.
- Private verification, security, complaint, payment-instruction and customer-location data must not leak through public projections.
- State-changing endpoints validate current entity state, actor relationship and required permissions.
- Provider actions that create new marketplace work must revalidate provider eligibility.
- Concurrency conflicts return a conflict response rather than creating duplicate exclusive assignments.
- Customer repair payments are off-platform; subscription-payment APIs are separate from repair-payment acknowledgement APIs.

## Standard Response Shapes

### Success

```json
{
  "data": {},
  "meta": {}
}
```

### Error

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

### List

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

## 1. Authentication

- `POST /auth/otp/request`
- `POST /auth/otp/verify`
- `POST /auth/logout`
- `POST /auth/phone-change/request`
- `POST /auth/phone-change/verify`

Authentication requirements include normalized phone numbers, OTP expiry, attempt/rate limits, replay protection, session creation/revocation and security-event logging.

---

## 2. Customer Profile

- `GET /me/customer-profile`
- `PUT /me/customer-profile`

Protected phone-number changes must use the dedicated phone-change OTP flow.

---

## 3. Public Catalogue, Locations & Provider Search

- `GET /service-categories`
- `GET /service-subcategories?category_id=`
- `GET /repair-services?subcategory_id=&q=`
- `GET /locations?parent_id=&marketplace_enabled=true`
- `GET /providers/search?service_id=&location_id=&availability=&rating=&provider_type=&page=`
- `GET /providers/{provider_id}`

Provider search must use canonical service/location identifiers. Free-text island equality must never determine eligibility.

---

## 4. Repair Requests

- `POST /repair-requests`
- `GET /repair-requests/{id}`
- `GET /me/repair-requests`
- `PATCH /repair-requests/{id}`
- `POST /repair-requests/{id}/submit`
- `POST /repair-requests/{id}/cancel`
- `POST /repair-requests/{id}/media`
- `GET /repair-requests/{id}/timeline`

Final submission should be idempotent. Request creation must preserve exact service, workflow type, canonical service island/atoll and booking mode.

---

## 5. Direct Booking & Smart Matching

### Provider Leads

- `GET /provider/leads`
- `GET /provider/leads/{id}`
- `POST /provider/leads/{id}/accept`
- `POST /provider/leads/{id}/decline`

### Admin Matching / Assignment

- `GET /admin/repair-requests/unassigned`
- `GET /admin/repair-requests/{id}/eligible-providers`
- `POST /admin/repair-requests/{id}/assign`
- `POST /admin/repair-requests/{id}/reassign`

### Direct Booking Fallback

Implementation should expose customer-authorized fallback actions equivalent to:

- choose another provider
- convert Direct Booking to Smart Matching
- cancel request

A Direct Booking request must never silently broaden or silently assign another provider.

Lead acceptance must call the concurrency-safe/atomic assignment path created by Migration `0005` and revalidate lead, request, provider, service, geography, suspension, availability and entitlement state.

---

## 6. Provider Onboarding & Profile

- `POST /provider/profile`
- `GET /provider/profile`
- `PUT /provider/profile`
- `PUT /provider/services`
- `PUT /provider/service-areas`
- `PUT /provider/availability`
- `POST /provider/application/submit`

Provider APIs must preserve the distinction between legal/registered location, operational base and approved additional service islands.

Provider-service configuration operates on exact service IDs, not broad category membership.

---

## 7. Provider Verification

Provider:

- `POST /provider/verifications`
- `POST /provider/verifications/{id}/documents`
- `GET /provider/verifications`

Admin:

- `GET /admin/verifications`
- `GET /admin/verifications/{id}`
- `POST /admin/verifications/{id}/approve`
- `POST /admin/verifications/{id}/request-information`
- `POST /admin/verifications/{id}/reject`

Verification documents are private. Approval/rejection requires appropriate permission and audit history.

---

## 8. Provider Administration

- `GET /admin/providers`
- `GET /admin/providers/{id}`
- `POST /admin/providers/{id}/approve`
- `POST /admin/providers/{id}/reject`
- `POST /admin/providers/{id}/suspend`
- `POST /admin/providers/{id}/reactivate`

Reactivation does not automatically bypass verification, subscription, service or geographic eligibility.

---

## 9. Jobs

Planned for Migration `0006` and subsequent application-service implementation:

- `GET /provider/jobs`
- `GET /me/jobs`
- `GET /jobs/{id}`
- `POST /jobs/{id}/start`
- `POST /jobs/{id}/progress`
- `POST /jobs/{id}/waiting-for-parts`
- `POST /jobs/{id}/resume`
- `POST /jobs/{id}/complete`
- `POST /jobs/{id}/confirm-completion`
- `POST /jobs/{id}/dispute-completion`

Each transition validates current state and actor relationship and appends timeline/audit history.

---

## 10. Inspections

Planned for Migration `0007`:

- `POST /jobs/{id}/inspection/schedule`
- `POST /jobs/{id}/inspection/start`
- `PUT /jobs/{id}/inspection/diagnosis`
- `POST /jobs/{id}/inspection/complete`

DIAGNOSIS_REQUIRED services must use the inspection/quotation path before materially charge-changing work proceeds.

---

## 11. Quotations

Planned for Migration `0007`:

- `POST /jobs/{id}/quotations`
- `GET /jobs/{id}/quotation`
- `PUT /quotations/{id}/draft`
- `POST /quotations/{id}/submit`
- `POST /quotations/{id}/approve`
- `POST /quotations/{id}/reject`
- `POST /quotations/{id}/revise`

Server recalculates totals. Revision creates a new version and preserves history. Customer approval applies only to the current eligible quotation version.

---

## 12. Parts & Labour

Planned with the job lifecycle:

- `POST /jobs/{id}/parts`
- `PATCH /jobs/{id}/parts/{part_id}`
- `DELETE /jobs/{id}/parts/{part_id}`
- `POST /jobs/{id}/labour`
- `PATCH /jobs/{id}/labour/{labour_id}`

Finalized historical records must not be destructively rewritten through ordinary CRUD behavior.

---

## 13. Off-Platform Repair Payment Acknowledgement

Planned for Migration `0008`.

Implementation should provide APIs equivalent to:

- get provider accepted payment methods/instructions for an authorized job
- customer `I Have Paid` declaration
- provider `Payment Received` acknowledgement
- view off-platform payment acknowledgement status/history
- report payment issue
- upload controlled payment evidence

These endpoints record declarations only. They must never represent the repair payment as processed, escrowed, held, refunded or paid out by iFixIt.

---

## 14. Warranty

- `GET /me/warranties`
- `GET /warranties/{id}`
- `POST /warranties/{id}/claims`
- `GET /provider/warranty-claims`
- `POST /warranty-claims/{id}/respond`
- `GET /admin/warranty-claims`
- `POST /admin/warranty-claims/{id}/resolve`

Warranty remains later-phase implementation unless explicitly pulled into MVP sequencing.

---

## 15. Reviews & Ratings

Planned for Migration `0009`:

- `POST /jobs/{id}/review`
- `PATCH /reviews/{id}`
- `GET /providers/{id}/reviews`
- provider response endpoint where enabled
- review flag/report endpoint
- `POST /admin/reviews/{id}/hide`
- `POST /admin/reviews/{id}/restore`

Only eligible completed/finalized platform jobs may create verified reviews. Admins must not impersonate customers by authoring customer ratings.

---

## 16. Complaints

Planned for Migration `0009`:

- `POST /complaints`
- `GET /me/complaints`
- `GET /complaints/{id}`
- `POST /complaints/{id}/evidence`
- `GET /admin/complaints`
- `POST /admin/complaints/{id}/assign`
- `POST /admin/complaints/{id}/request-customer-info`
- `POST /admin/complaints/{id}/request-provider-info`
- `POST /admin/complaints/{id}/resolve`
- `POST /admin/complaints/{id}/reject`

Complaint evidence and internal notes are private. Any refund/compensation result must be represented as an agreed/reported off-platform outcome unless iFixIt later implements customer-payment processing.

---

## 17. Notifications

Planned for Migration `0009`:

- `GET /me/notifications`
- `POST /me/notifications/{id}/read`
- `PUT /me/notification-preferences`

Notification generation should be internal/domain-event driven rather than exposed as a general public write endpoint.

Potential delivery adapters include in-app, push, SMS, email and WhatsApp, subject to configuration, consent and provider integration.

Notification failure must not roll back a successful authoritative business transaction such as assignment acceptance.

---

## 18. Provider Subscriptions

Planned for Migration `0010`:

- `GET /subscription-plans`
- `GET /provider/subscription`
- `POST /provider/subscription/select-plan`
- `POST /provider/subscription/renew`
- `GET /admin/subscriptions`
- `POST /admin/subscriptions/{id}/extend`

Plans such as Starter, Professional and Business must be data/configuration driven.

Migration `0010` must bind authoritative subscription state into the provider matching eligibility gate introduced in Migration `0005`.

---

## 19. Promotional Campaigns

Planned for Migration `0010` and based on Steps 14–14A.

API capabilities should include:

- retrieve active launch campaign/stage
- show provider-specific campaign eligibility and upcoming billing timeline
- acknowledge promotional pricing terms
- view Founding Provider designation/benefits
- admin create/update/activate/deactivate campaign
- admin configure campaign stages and entitlements
- campaign conversion/retention reporting

Promotional pricing must remain configuration-driven and historically auditable.

---

## 20. Provider Subscription Payments

These are platform payments, not customer repair payments.

- `POST /payments/subscription/initiate`
- `GET /payments/{id}`
- `GET /payments/{id}/status`
- `POST /webhooks/payments/{gateway}`
- `GET /admin/payments`
- `POST /admin/payments/{id}/reconcile`

Payment webhooks require signature validation and event idempotency. Browser return URLs must never be treated as authoritative payment success.

---

## 21. Admin Master Data

### Services

- `POST /admin/service-categories`
- `PATCH /admin/service-categories/{id}`
- `POST /admin/service-subcategories`
- `PATCH /admin/service-subcategories/{id}`
- `POST /admin/repair-services`
- `PATCH /admin/repair-services/{id}`
- `POST /admin/repair-services/{id}/archive`

### Locations

- `POST /admin/locations`
- `PATCH /admin/locations/{id}`
- `POST /admin/locations/{id}/archive`

### Subscription Plans

- `POST /admin/subscription-plans`
- `PATCH /admin/subscription-plans/{id}`
- `POST /admin/subscription-plans/{id}/archive`

Normal catalogue expansion should be data-driven and not require code changes.

---

## 22. Admin Operations & Reporting

Planned for Migration `0011`:

- `GET /admin/dashboard`
- `GET /admin/jobs`
- `GET /admin/jobs/{id}`
- `POST /admin/jobs/{id}/correct-state`
- `GET /admin/reports/repairs`
- `GET /admin/reports/providers`
- `GET /admin/reports/quotations`
- `GET /admin/reports/subscriptions`
- `GET /admin/reports/supply-demand`
- `GET /admin/audit-events`

High-impact administrative corrections require explicit permissions, reason and audit history.

---

## 23. Authorization Requirements for Every Protected Endpoint

Validate all applicable dimensions:

1. authenticated identity
2. active account state
3. role
4. explicit permission where required
5. resource ownership/relationship
6. current entity state
7. provider hard eligibility for actions that create new marketplace work
8. canonical geography and matching scope when dispatch is involved

Changing a UUID in a URL must never permit horizontal privilege escalation.

---

## 24. Idempotency Requirements

Require or strongly recommend idempotency for:

- submit repair request
- accept exclusive lead
- create assignment
- submit quotation
- approve quotation
- complete job
- customer payment acknowledgement
- provider receipt acknowledgement
- initiate subscription payment
- payment webhook processing
- submit review
- complaint resolution where retries are possible

Duplicate retries should return the original logical result where safe.

---

## 25. HTTP Status Guidance

- `200` successful read/update
- `201` created
- `202` accepted for asynchronous processing
- `204` success with no response body
- `400` invalid input
- `401` unauthenticated
- `403` authenticated but unauthorized
- `404` resource not found or deliberately not visible
- `409` state/concurrency/idempotency conflict
- `422` business validation failure
- `429` rate limited
- `500` unexpected server error
- `503` temporary dependency unavailable

---

## 26. Current Implementation Alignment

Database foundation currently implemented:

- `0001_core_domain.sql`
- `0002_auth_rbac.sql`
- `0003_location_catalogue.sql`
- `0004_provider_onboarding_service_areas_availability.sql`
- `0005_search_tier_matching_engine.sql`

The API groups most ready for application implementation now are:

- Authentication
- Customer profile
- Public catalogue / locations
- Provider search
- Provider onboarding
- Provider services / service areas / availability
- Verification metadata workflow
- Repair requests
- Direct Booking / Smart Matching
- Provider leads
- Atomic acceptance / assignment

Later API groups become implementation-ready as migrations `0006`–`0012` are added.

## Source Documents

This catalogue should remain synchronized with:

- `STEP_7_API_CONTRACTS.md`
- `MVP_BUSINESS_MODEL_AND_SCOPE_FREEZE.md`
- `LOCAL_ISLAND_MATCHING_AND_LOCATION_ARCHITECTURE.md`
- `STEP_12_BUSINESS_SPECIFICATION_RECONCILIATION.md`
- `STEP_13_CUSTOMER_COMPLAINT_AND_RATING_SYSTEM.md`
- `STEP_14_PROVIDER_SUBSCRIPTION_LAUNCH_PROMOTION.md`
- `STEP_14A_PROVIDER_PROMOTION_UI_MESSAGING_AND_FORECAST.md`
- `STEP_15_JOB_ACCEPTANCE_AND_CUSTOMER_NOTIFICATION_SYSTEM.md`
- `STEP_16_OFF_PLATFORM_CUSTOMER_PROVIDER_PAYMENT_CONFIRMATION.md`
- `docs/architecture/IMPLEMENTED_VS_TARGET_ARCHITECTURE.md`
