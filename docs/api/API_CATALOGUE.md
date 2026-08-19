# iFixIt — Consolidated API Catalogue

**Base path:** `/api/v1`  
**Style:** REST/JSON over HTTPS  
**Status:** Synchronized implementation-facing catalogue  
**Version:** 2.0  
**Date:** 2026-08-19

This is the compact implementation index for the API. `STEP_7_API_CONTRACTS.md` Version 2.0 is the detailed contract. The database implementation boundary is migrations `0001`–`0006`.

## Core Rules

- Server-side authorization is authoritative.
- UUIDs identify resources; public ticket/job numbers are display/search references.
- Critical writes use idempotency.
- Lists are paginated where unbounded.
- Canonical `atoll_id`/`island_id` are required for geographic operations.
- Free-text island equality never determines provider eligibility.
- Direct Booking cannot silently broaden to Smart Matching or another provider.
- Lead acceptance must use concurrency-safe atomic assignment.
- `DIAGNOSIS_REQUIRED` work cannot bypass inspection/diagnosis and approval of the current quotation version.
- Customer repair-payment acknowledgement is separate from provider subscription payments.
- Private verification, complaint, payment-instruction and customer-location data must not leak through public projections.

---

## 1. Authentication — Foundation Implemented

- `POST /auth/otp/request`
- `POST /auth/otp/verify`
- `POST /auth/logout`
- `POST /auth/refresh`
- `POST /auth/phone-change/request`
- `POST /auth/phone-change/verify`

Security: normalized phone, OTP expiry/attempt/rate limits, replay protection, secure session rotation/revocation and security-event logging.

---

## 2. Current User — Foundation Implemented

- `GET /me`
- `PATCH /me`
- `GET /me/roles`

A separate customer-profile identity resource is not authoritative in the current data model.

---

## 3. Canonical Maldives Geography — Foundation Implemented

- `GET /atolls`
- `GET /atolls/{atoll_id}`
- `GET /islands?atoll_id=&serviceable=true&q=`
- `GET /islands/{island_id}`

The previous generic `/locations` marketplace contract is superseded by canonical atoll/island APIs.

---

## 4. Service Catalogue — Foundation Implemented

- `GET /service-categories`
- `GET /service-subcategories?category_id=`
- `GET /repair-services?subcategory_id=&q=`
- `GET /repair-services/{service_id}`

---

## 5. Provider Search & Public Profile — Foundation Implemented

- `GET /providers/search?service_id=&island_id=&availability=&rating=&provider_type=&page=`
- `GET /providers/{provider_id}`
- `GET /providers/{provider_id}/reviews` `[0009]`
- `POST /providers/{provider_id}/favourite` `[planned]`
- `DELETE /providers/{provider_id}/favourite` `[planned]`

Search uses exact service + canonical island and performs hard eligibility before ranking.

---

## 6. Repair Requests — Foundation Implemented

- `POST /repair-requests`
- `GET /repair-requests/{id}`
- `GET /me/repair-requests`
- `PATCH /repair-requests/{id}`
- `POST /repair-requests/{id}/submit`
- `POST /repair-requests/{id}/cancel`
- `POST /repair-requests/{id}/media`
- `GET /repair-requests/{id}/timeline`

Request payload preserves booking model, requested provider when Direct Booking, exact service, canonical service atoll/island, urgency, workflow and authorized matching scope.

---

## 7. Direct Booking Fallback — Foundation Data Implemented

- `GET /repair-requests/{id}/fallback-options`
- `POST /repair-requests/{id}/fallback-decision`

Allowed customer choices: choose another provider, convert to Smart Matching, or cancel.

---

## 8. Provider Onboarding — Foundation Implemented

- `POST /provider/profile`
- `GET /provider/profile`
- `PUT /provider/profile`
- `PUT /provider/services`
- `PUT /provider/services/{provider_service_id}/pricing`
- `PUT /provider/service-areas`
- `PUT /provider/availability`
- `PUT /provider/availability/overrides`
- `POST /provider/application/submit`

Legal registration, operational base and approved service islands remain separate.

---

## 9. Provider Verification — Foundation Implemented

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

---

## 10. Provider Administration — Foundation Implemented

- `GET /admin/providers`
- `GET /admin/providers/{id}`
- `POST /admin/providers/{id}/approve`
- `POST /admin/providers/{id}/reject`
- `POST /admin/providers/{id}/suspend`
- `POST /admin/providers/{id}/reactivate`

Reactivation never bypasses verification, service, geography or future subscription eligibility.

---

## 11. Matching, Leads & Atomic Assignment — Foundation Implemented

Provider:

- `GET /provider/leads`
- `GET /provider/leads/{id}`
- `POST /provider/leads/{id}/view`
- `POST /provider/leads/{id}/accept`
- `POST /provider/leads/{id}/decline`

Admin:

- `GET /admin/repair-requests/unassigned`
- `GET /admin/repair-requests/{id}/eligible-providers`
- `POST /admin/repair-requests/{id}/assign`
- `POST /admin/repair-requests/{id}/reassign`

Acceptance must call the atomic path and revalidate lead expiry/ownership, provider hard eligibility, service, geography and active assignment state.

---

## 12. Jobs & Timeline — Database Foundation Implemented in 0006

- `GET /provider/jobs`
- `GET /me/jobs`
- `GET /jobs/{id}`
- `GET /jobs/{id}/timeline`
- `POST /jobs/{id}/schedule`
- `POST /jobs/{id}/reschedule`
- `POST /jobs/{id}/progress`
- `POST /jobs/{id}/start`
- `POST /jobs/{id}/waiting-for-parts`
- `POST /jobs/{id}/hold`
- `POST /jobs/{id}/resume`

Application handlers must use the canonical job state machine and relationship checks.

---

## 13. Inspections — Planned 0007

- `POST /jobs/{id}/inspection/schedule`
- `POST /jobs/{id}/inspection/start`
- `PUT /jobs/{id}/inspection/diagnosis`
- `POST /jobs/{id}/inspection/complete`

---

## 14. Versioned Quotations — Planned 0007

- `POST /jobs/{id}/quotations`
- `GET /jobs/{id}/quotation`
- `GET /quotations/{id}/versions`
- `PUT /quotations/{id}/draft`
- `POST /quotations/{id}/submit`
- `POST /quotations/{id}/approve`
- `POST /quotations/{id}/reject`
- `POST /quotations/{id}/revise`

Server recalculates totals. Approval applies only to the current eligible version. Revision preserves prior versions.

---

## 15. Parts, Labour & Completion — Planned/Extended 0007

- `POST /jobs/{id}/parts`
- `PATCH /jobs/{id}/parts/{part_id}`
- `DELETE /jobs/{id}/parts/{part_id}`
- `POST /jobs/{id}/labour`
- `PATCH /jobs/{id}/labour/{labour_id}`
- `POST /jobs/{id}/complete`
- `POST /jobs/{id}/confirm-completion`
- `POST /jobs/{id}/dispute-completion`

---

## 16. Off-Platform Repair Payment Acknowledgement — Planned 0008

- `GET /jobs/{id}/payment-methods`
- `POST /jobs/{id}/payment-acknowledgements/customer-paid`
- `POST /jobs/{id}/payment-acknowledgements/provider-received`
- `GET /jobs/{id}/payment-acknowledgement`
- `POST /jobs/{id}/payment-evidence`
- `POST /jobs/{id}/payment-issue`

These endpoints record declarations/evidence only. iFixIt does not hold, escrow, split, pay out or automatically refund customer repair money in MVP.

---

## 17. Reviews & Ratings — Planned 0009

Canonical new-review dimensions: Quality, Punctuality, Communication, Value for Money.

- `POST /jobs/{id}/review`
- `GET /me/reviews`
- `PATCH /reviews/{id}`
- `DELETE /reviews/{id}` `[policy controlled]`
- `GET /providers/{id}/reviews`
- `POST /reviews/{id}/response`
- `PATCH /reviews/{id}/response`
- `POST /reviews/{id}/flag`
- `POST /admin/reviews/{id}/moderate`
- `POST /admin/reviews/{id}/hide`
- `POST /admin/reviews/{id}/restore`

---

## 18. Complaints — Planned 0009

- `POST /complaints`
- `GET /me/complaints`
- `GET /complaints/{id}`
- `POST /complaints/{id}/evidence`
- `POST /complaints/{id}/updates`
- `GET /admin/complaints`
- `POST /admin/complaints/{id}/assign`
- `POST /admin/complaints/{id}/request-customer-info`
- `POST /admin/complaints/{id}/request-provider-info`
- `POST /admin/complaints/{id}/escalate`
- `POST /admin/complaints/{id}/resolve`
- `POST /admin/complaints/{id}/reject`

---

## 19. Notifications — Planned 0009

- `GET /me/notifications`
- `POST /me/notifications/{id}/read`
- `PUT /me/notification-preferences`

Generation is domain-event driven; delivery failure does not roll back the source business transaction.

---

## 20. Provider Subscriptions & Platform Payments — Planned 0010

Subscriptions:

- `GET /subscription-plans`
- `GET /provider/subscription`
- `POST /provider/subscription/select-plan`
- `POST /provider/subscription/renew`
- `POST /provider/subscription/cancel`

Platform subscription payments:

- `POST /payments/subscription/initiate`
- `GET /payments/subscription/{id}`
- `GET /payments/subscription/{id}/status`
- `POST /webhooks/payments/{gateway}`

Admin:

- `GET /admin/subscriptions`
- `POST /admin/subscriptions/{id}/extend`
- `GET /admin/subscription-payments`
- `POST /admin/subscription-payments/{id}/reconcile`

Gateway webhooks require signature validation and event idempotency. Browser return pages are not payment authority.

---

## 21. Promotions — Planned 0010

- `GET /provider/promotion`
- `POST /provider/promotion/acknowledge`
- admin campaign/stage/eligibility configuration endpoints
- campaign conversion/retention reporting

Promotional values are configuration-driven and auditable.

---

## 22. Warranty — Planned

- `GET /me/warranties`
- `GET /warranties/{id}`
- `POST /warranties/{id}/claims`
- `GET /provider/warranty-claims`
- `POST /warranty-claims/{id}/respond`
- `GET /admin/warranty-claims`
- `POST /admin/warranty-claims/{id}/resolve`

---

## 23. Admin Master Data

Services:

- `POST /admin/service-categories`
- `PATCH /admin/service-categories/{id}`
- `POST /admin/service-subcategories`
- `PATCH /admin/service-subcategories/{id}`
- `POST /admin/repair-services`
- `PATCH /admin/repair-services/{id}`
- `POST /admin/repair-services/{id}/archive`

Canonical geography:

- `POST /admin/atolls`
- `PATCH /admin/atolls/{id}`
- `POST /admin/islands`
- `PATCH /admin/islands/{id}`
- `POST /admin/islands/{id}/disable`
- `POST /admin/island-aliases`

Primary canonical IDs remain immutable.

---

## 24. Admin Reporting & Audit — Planned 0011

- `GET /admin/dashboard`
- `GET /admin/jobs`
- `GET /admin/jobs/{id}`
- `POST /admin/jobs/{id}/correct-state`
- `GET /admin/reports/repairs`
- `GET /admin/reports/providers`
- `GET /admin/reports/quotations`
- `GET /admin/reports/subscriptions`
- `GET /admin/reports/supply-demand`
- `GET /admin/reports/geography`
- `GET /admin/audit-events`

---

## 25. Protected Endpoint Authorization

Validate all applicable dimensions:

1. authenticated identity
2. active account state
3. role
4. explicit permission
5. ownership/relationship
6. current entity state
7. provider hard eligibility
8. canonical geography/matching scope
9. subscription entitlement where applicable

Changing a URL UUID must never allow horizontal privilege escalation.

---

## 26. Idempotent Operations

Require/recommend idempotency for:

- final repair request submission
- lead acceptance
- assignment/reassignment
- quotation submit/approve
- job completion/finalization
- repair-payment declarations
- subscription payment initiation
- payment webhook processing
- review submission
- retryable high-impact admin actions

---

## 27. Implementation Boundary

**Database foundations implemented:** `0001`–`0006`.

**Next required integrity/build step:** Migration `0007`, including the workflow-specific guard that prevents `DIAGNOSIS_REQUIRED` repair from starting before inspection/diagnosis and customer approval of the current quotation version.

Source-of-truth reconciliation: `docs/architecture/SPECIFICATION_SYNCHRONIZATION_BASELINE.md`.