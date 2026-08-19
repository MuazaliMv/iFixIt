# iFixIt — Step 7: API Contracts

**Document Type:** REST API Specification  
**Status:** Draft for approval  
**Version:** 1.0  
**Date:** 2026-08-19

---

## 1. API Principles

- REST/JSON over HTTPS.
- Version base path: `/api/v1`.
- Server is authoritative for permissions, totals, state transitions and eligibility.
- Resource identifiers use UUIDs; public ticket/job numbers may be used for display/search.
- Critical write operations support idempotency.
- Standard error envelope is used consistently.
- Pagination is mandatory for unbounded lists.
- API responses never expose private verification/security data without explicit permission.

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

## 3. Authentication

### POST `/auth/otp/request`
Public. Request OTP.

Request: phone.  
Responses: challenge ID, masked phone, expiry.  
Errors: invalid phone, unsupported phone, rate limited, provider unavailable.

### POST `/auth/otp/verify`
Public with challenge.

Request: challenge_id, otp.  
Response: authenticated session/user summary.  
Errors: invalid/expired/consumed challenge, too many attempts.

### POST `/auth/logout`
Authenticated. Revokes current session.

### POST `/auth/phone-change/request`
Authenticated. Starts verified-phone change.

### POST `/auth/phone-change/verify`
Authenticated. Confirms new phone using OTP.

---

## 4. Customer Profile

### GET `/me/customer-profile`
Customer self.

### PUT `/me/customer-profile`
Customer self. Editable fields only.

Protected phone changes must use auth phone-change endpoints.

---

## 5. Public Catalogue & Search

### GET `/service-categories`
### GET `/service-subcategories?category_id=`
### GET `/repair-services?subcategory_id=&q=`
### GET `/locations?parent_id=&marketplace_enabled=true`
### GET `/providers/search?service_id=&location_id=&availability=&rating=&provider_type=&page=`
### GET `/providers/{provider_id}`

Public provider responses must use public projection only.

---

## 6. Repair Requests

### POST `/repair-requests`
Customer. Creates draft or submitted request according to payload mode.

Idempotency header required for final submission.

### GET `/repair-requests/{id}`
Owner, assigned provider where permitted, or authorized admin.

### GET `/me/repair-requests`
Customer self.

### PATCH `/repair-requests/{id}`
Customer owner while editable draft/pre-submit state permits.

### POST `/repair-requests/{id}/submit`
Customer owner. Validates current service/location and transitions to `SUBMITTED`.

### POST `/repair-requests/{id}/cancel`
Customer/admin as allowed. Reason accepted/required by policy.

### POST `/repair-requests/{id}/media`
Customer owner. Upload metadata/association after controlled file upload.

### GET `/repair-requests/{id}/timeline`
Authorized participant/admin.

---

## 7. Provider Onboarding & Profile

### POST `/provider/profile`
Authenticated applicant.

### GET `/provider/profile`
Provider self.

### PUT `/provider/profile`
Provider self; protected fields excluded.

### PUT `/provider/services`
Provider self. Replaces/updates active exact service mappings.

### PUT `/provider/service-areas`
Provider self.

### PUT `/provider/availability`
Provider self.

### POST `/provider/application/submit`
Provider applicant. Checks prerequisites and enters review state.

---

## 8. Verification

### POST `/provider/verifications`
Provider self. Creates verification submission.

### POST `/provider/verifications/{id}/documents`
Provider self, controlled private upload.

### GET `/provider/verifications`
Provider self.

Admin:
### GET `/admin/verifications`
### GET `/admin/verifications/{id}`
### POST `/admin/verifications/{id}/approve`
### POST `/admin/verifications/{id}/request-information`
### POST `/admin/verifications/{id}/reject`

Decision writes require permission and audit reason where applicable.

---

## 9. Provider Approval & Administration

### GET `/admin/providers`
Filters: approval_status, suspension_status, service, location.

### GET `/admin/providers/{id}`

### POST `/admin/providers/{id}/approve`
Permission: `provider.approve`.

### POST `/admin/providers/{id}/reject`
Reason required.

### POST `/admin/providers/{id}/suspend`
Permission: `provider.suspend`; reason required.

### POST `/admin/providers/{id}/reactivate`
Recalculates eligibility; does not bypass subscription/verification.

---

## 10. Matching, Leads & Assignment

### GET `/provider/leads`
Provider self.

### GET `/provider/leads/{id}`
Provider self when target of lead.

### POST `/provider/leads/{id}/accept`
Atomic acceptance. Revalidates lead/request/provider state.

### POST `/provider/leads/{id}/decline`
Optional decline reason.

Admin:
### GET `/admin/repair-requests/unassigned`
### GET `/admin/repair-requests/{id}/eligible-providers`
### POST `/admin/repair-requests/{id}/assign`
### POST `/admin/repair-requests/{id}/reassign`

Assignment/reassignment require current eligibility validation and audit.

---

## 11. Jobs & Inspections

### GET `/provider/jobs`
### GET `/me/jobs`
### GET `/jobs/{id}`
Authorized participants/admin.

Inspection:
### POST `/jobs/{id}/inspection/schedule`
### POST `/jobs/{id}/inspection/start`
### PUT `/jobs/{id}/inspection/diagnosis`
### POST `/jobs/{id}/inspection/complete`

Each transition validates current state and actor relationship.

---

## 12. Quotations

### POST `/jobs/{id}/quotations`
Provider assigned to job. Creates draft quotation.

### GET `/jobs/{id}/quotation`
Authorized customer/provider/admin.

### PUT `/quotations/{id}/draft`
Provider; only editable draft/current revision.

### POST `/quotations/{id}/submit`
Provider. Server recalculates totals.

### POST `/quotations/{id}/approve`
Customer owner only; current unexpired version only.

### POST `/quotations/{id}/reject`
Customer owner.

### POST `/quotations/{id}/revise`
Provider; creates new version and preserves prior version.

Money fields supplied by client are validated/recomputed server-side.

---

## 13. Repair Progress, Parts & Labour

### POST `/jobs/{id}/start`
Provider. Requires all prerequisites.

### POST `/jobs/{id}/progress`
Provider. Append progress event.

### POST `/jobs/{id}/waiting-for-parts`
Provider.

### POST `/jobs/{id}/resume`
Provider.

### POST `/jobs/{id}/parts`
### PATCH `/jobs/{id}/parts/{part_id}`
### DELETE `/jobs/{id}/parts/{part_id}`
Only while mutable active job state permits; deletion means removal from current work record, not historical audit if already finalized.

### POST `/jobs/{id}/labour`
### PATCH `/jobs/{id}/labour/{labour_id}`

### POST `/jobs/{id}/complete`
Provider. Validates completion data.

### POST `/jobs/{id}/confirm-completion`
Customer owner.

### POST `/jobs/{id}/dispute-completion`
Customer owner; creates/links complaint.

---

## 14. Warranty

### GET `/me/warranties`
### GET `/warranties/{id}`
Authorized participants/admin.

### POST `/warranties/{id}/claims`
Customer owner with active eligible warranty.

### GET `/provider/warranty-claims`
### POST `/warranty-claims/{id}/respond`
As allowed by policy.

Admin:
### GET `/admin/warranty-claims`
### POST `/admin/warranty-claims/{id}/resolve`

---

## 15. Reviews

### POST `/jobs/{id}/review`
Customer owner. One verified review per eligible finalized job.

### PATCH `/reviews/{id}`
Review owner within configured edit window.

### GET `/providers/{id}/reviews`
Public projection.

Admin:
### POST `/admin/reviews/{id}/hide`
### POST `/admin/reviews/{id}/restore`
Reason/audit required.

---

## 16. Complaints

### POST `/complaints`
Customer/provider.

### GET `/me/complaints`
Current user’s complaints.

### GET `/complaints/{id}`
Authorized participant/admin.

### POST `/complaints/{id}/evidence`
Authorized participant.

Admin:
### GET `/admin/complaints`
### POST `/admin/complaints/{id}/assign`
### POST `/admin/complaints/{id}/request-customer-info`
### POST `/admin/complaints/{id}/request-provider-info`
### POST `/admin/complaints/{id}/resolve`
### POST `/admin/complaints/{id}/reject`

---

## 17. Subscriptions

### GET `/subscription-plans`
Provider/public as configured.

### GET `/provider/subscription`
Provider self.

### POST `/provider/subscription/select-plan`
Provider.

### POST `/provider/subscription/renew`
Provider.

Admin:
### GET `/admin/subscriptions`
### POST `/admin/subscriptions/{id}/extend`
Reason and permission required.

---

## 18. Payments

### POST `/payments/subscription/initiate`
Provider. Server calculates amount.

### GET `/payments/{id}`
Payment owner/admin.

### GET `/payments/{id}/status`
Owner/admin; authoritative backend state.

### POST `/webhooks/payments/{gateway}`
Gateway callback. Signature validation + event idempotency mandatory.

Admin:
### GET `/admin/payments`
### POST `/admin/payments/{id}/reconcile`
High privilege; audit required.

Browser return URLs do not mark payment successful.

---

## 19. Notifications

### GET `/me/notifications`
### POST `/me/notifications/{id}/read`
### PUT `/me/notification-preferences`

Internal notification generation should be domain-event driven rather than exposed as general public write API.

---

## 20. Admin Master Data

Services:
### POST `/admin/service-categories`
### PATCH `/admin/service-categories/{id}`
### POST `/admin/service-subcategories`
### PATCH `/admin/service-subcategories/{id}`
### POST `/admin/repair-services`
### PATCH `/admin/repair-services/{id}`
### POST `/admin/repair-services/{id}/archive`

Locations:
### POST `/admin/locations`
### PATCH `/admin/locations/{id}`
### POST `/admin/locations/{id}/archive`

Plans:
### POST `/admin/subscription-plans`
### PATCH `/admin/subscription-plans/{id}`
### POST `/admin/subscription-plans/{id}/archive`

---

## 21. Admin Operations & Reporting

### GET `/admin/dashboard`
### GET `/admin/jobs`
### GET `/admin/jobs/{id}`
### POST `/admin/jobs/{id}/correct-state`
High privilege; reason required.

Reports:
### GET `/admin/reports/repairs`
### GET `/admin/reports/providers`
### GET `/admin/reports/quotations`
### GET `/admin/reports/subscriptions`
### GET `/admin/reports/supply-demand`

Audit:
### GET `/admin/audit-events`
Read-only, permission `audit.view`.

---

## 22. Authorization & Ownership Rules

Every protected endpoint must validate all applicable dimensions:
1. authenticated identity
2. account active state
3. role
4. explicit permission where required
5. resource ownership/relationship
6. current entity state
7. provider eligibility when action concerns new marketplace work

Changing a URL/UUID must never allow horizontal privilege escalation.

---

## 23. Idempotency Requirements

Idempotency keys required/recommended for:
- submit repair request
- accept exclusive lead
- create assignment
- submit/approve quotation
- complete job
- initiate payment
- process payment webhook
- submit review

Duplicate requests return the original logical result where safe.

---

## 24. HTTP Status Guidance

- 200 successful read/update
- 201 created
- 202 accepted for asynchronous work
- 204 successful no-content action
- 400 invalid input
- 401 unauthenticated
- 403 authenticated but unauthorized
- 404 resource not found/not visible
- 409 state/concurrency/idempotency conflict
- 422 business validation failure
- 429 rate limited
- 500 unexpected server error
- 503 temporary dependency unavailable

---

## 25. Step 7 Approval Gate

- [ ] Endpoint coverage maps to use cases/UI
- [ ] Request/response conventions approved
- [ ] Auth/permission rules approved
- [ ] Idempotency approved
- [ ] Error model approved
- [ ] Payment webhook rules approved
- [ ] Pagination/filtering approved
- [ ] Private/public projections approved

After approval, proceed to Step 8 Roles & Permission Matrix.
