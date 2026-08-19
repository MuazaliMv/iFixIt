# iFixIt — Step 13: Customer Complaint & Rating System

**Document Type:** Detailed Functional Specification  
**Status:** Synchronized Implementation Baseline Input  
**Version:** 2.0  
**Date:** 2026-08-19

---

## 1. Purpose

This document defines the synchronized complaint, rating, review-response and moderation requirements for iFixIt.

It supplements the approved MVP, security, authorization, payment and workflow baselines. For implemented structures, committed migrations remain authoritative.

---

## 2. Complaint Entry Points

Authenticated customers shall be able to start an eligible complaint from:

1. Job History
2. Active Job Detail where policy permits
3. Provider Profile / Report Issue, with job selection when complaint is job-related
4. My Complaints / Support

A job-linked complaint must derive the customer/provider relationship from the actual job. Users cannot fabricate unrelated provider/job associations.

Providers may also file supported provider-side complaints where policy permits.

---

## 3. Complaint Categories

Customer complaint categories shall support at least:

- `PROVIDER_NO_SHOW`
- `POOR_WORKMANSHIP`
- `UNEXPECTED_PRICING`
- `UNSAFE_BEHAVIOUR`
- `INCORRECT_INFORMATION`
- `PROPERTY_DAMAGE`
- `UNPROFESSIONAL_CONDUCT`
- `REPEAT_OR_INCOMPLETE_ISSUE`
- `OTHER`

Provider-side categories may include:

- `ABUSIVE_CUSTOMER`
- `FRAUDULENT_REQUEST`
- `UNREASONABLE_DEMAND`
- `NON_PAYMENT`
- `OTHER`

Safety-related complaints must support elevated priority/escalation.

---

## 4. Complaint Evidence

Authorized participants may attach controlled private evidence including:

- photos
- short video where enabled
- documents/payment evidence where permitted
- other approved evidence types

Limits are configuration/policy values, not hard-coded business constants.

Complaint evidence must remain private and authorization-controlled.

---

## 5. Requested Outcome

A complainant may record a preferred resolution such as:

- redo/remediation
- mutual agreement
- refund requested from provider
- compensation requested from provider
- clarification/investigation
- other

**MVP financial rule:** refund/compensation are requested outcomes only. iFixIt does not automatically refund or compensate customer repair payments because customer-to-provider repair settlement remains off-platform.

---

## 6. Complaint Reference & Confirmation

Each complaint must receive a unique human-readable reference, e.g. `CMP-2026-000042`.

Confirmation should show:

- complaint reference
- related job/provider/service context
- submission time
- status
- next-step explanation
- My Complaints link

No fixed resolution SLA may be promised unless separately configured/approved.

---

## 7. Complaint Tracking

My Complaints should display:

- reference
- related provider/job/service
- complaint type
- filed date
- status
- latest customer-visible update
- View Details

Complaint detail should provide a chronological customer-visible timeline while preserving private/admin-only notes separately.

---

## 8. Complaint Status & Priority

Canonical database status names will be finalized in Migration 0009 and formal state matrices. UI labels may map to canonical states without creating duplicate database states.

Operational presentation should support equivalents of:

- New/Open
- Under Review
- Waiting for Customer
- Waiting for Provider
- Evidence Gathering
- Resolution Offered
- Resolved
- Rejected
- Closed
- Escalated

Priority should support:

- Critical
- High
- Medium
- Normal

Escalation must be auditable.

---

## 9. Rating Dimensions — RESOLVED

The synchronized MVP review model uses **four customer-visible rating dimensions**:

1. **Quality**
2. **Punctuality**
3. **Communication**
4. **Value for Money**

`overall_rating` is calculated from these four dimensions unless a later explicit approved product change replaces this rule.

Default calculation:

`overall_rating = (quality + punctuality + communication + value_for_money) / 4`

### Professionalism reconciliation

The legacy fifth dimension `professionalism` is **superseded for new MVP review records**. Professional conduct remains covered by Quality/Communication and by complaint categories such as `UNPROFESSIONAL_CONDUCT` where relevant.

Migration 0009 must therefore use the four-dimension model and must not introduce `professionalism` as a required new review field.

If legacy data ever exists from an earlier implementation, it may be retained historically but excluded from the canonical new-review calculation unless an explicit migration rule says otherwise.

---

## 10. Rating Eligibility

Only an eligible completed/finalized platform job may generate a verified review.

Rules:

- authenticated customer
- customer owns/participated in job
- job reached eligible completion/finalization state
- one logical verified review per eligible job
- moderation may affect public visibility

Entry points:

- automatic prompt after eligible completion/finalization
- Rate Now from Job History
- optional Remind Me Later

UI must not offer a second independent `Rate Again` action for the same job.

---

## 11. Review Form

The review form shall support:

- Quality 1–5
- Punctuality 1–5
- Communication 1–5
- Value for Money 1–5
- calculated overall rating
- written feedback
- optional completed-work photos
- optional `would_recommend`
- submit
- skip/remind later

Review media follows the platform media security/visibility model.

---

## 12. Provider Rating Aggregation

Public provider rating is derived from eligible published verified reviews.

Required aggregates:

- overall average
- Quality average
- Punctuality average
- Communication average
- Value for Money average
- review count

Removed/invalidated reviews are excluded. Edited versions must not be double counted.

Cached aggregates are allowed when fully recalculable from authoritative review records. Admins/providers cannot manually edit aggregate ratings as source of truth.

---

## 13. Rating Display & Accessibility

Provider profiles/search cards may show:

- average overall rating
- review count
- stars
- verified-service indicator
- dimension breakdown on profile

Colour may supplement ratings but cannot be the only signal.

---

## 14. Verified Service Review

A review receives Verified Service status only when:

- linked to an eligible iFixIt job
- reviewer is the job customer
- job reached eligible completion/finalization
- review has not been invalidated by moderation

Free-standing/manual reviews do not receive a Verified Service badge.

---

## 15. Provider Response

Provider may:

- view reviews about their own jobs/profile
- submit one public response per review subject to policy
- edit response where policy permits
- flag review for moderation

Provider cannot alter customer rating or review text.

Logical `review_responses` data includes:

- review ID
- provider ID
- response text
- moderation state where required
- created/updated timestamps

---

## 16. Customer Review Management

Support:

- View My Reviews
- edit own review within configurable policy
- delete/request deletion within configurable policy
- edited indicator
- history where required for moderation/audit

Exact edit/delete windows remain configurable and are not frozen in code.

---

## 17. Review Flagging

Flag reasons may include:

- abusive/offensive content
- private/personal information
- spam
- fraud/fabrication
- unrelated content
- harassment
- other policy violation

Flagging creates a moderation case/event. It does not automatically remove the review.

---

## 18. Review Moderation

Admin actions should support:

- keep/publish
- hide pending review
- remove from public display
- restore
- warn/restrict account under separate policy

Substantive customer content should not be silently rewritten. Any permitted personal-data redaction must retain private original content and record actor/reason/timestamp.

Every moderation action must be auditable.

---

## 19. Review Content Guidelines

Encourage:

- factual experience
- comments about actual work
- punctuality
- communication
- value/price experience
- relevant work photos

Moderate/disallow:

- threats/abuse
- unnecessary personal data
- knowingly fabricated claims
- spam/advertising
- harassment/discrimination
- illegal content

---

## 20. Notifications

Customer events include:

- complaint submitted/status changed
- more information requested
- resolution offered
- complaint resolved/closed
- review reminder
- provider response
- moderation outcome

Provider events include:

- complaint opened where disclosure permitted
- evidence/information requested
- complaint resolution/status update
- new review
- review moderation/flag outcome

Admin events include:

- new complaint
- critical/safety complaint
- escalation
- flagged review

Channels remain controlled by notification preferences/policy. Mandatory safety/security notices may have separate rules.

---

## 21. Planned Data Model — Migration 0009

### Complaints

Planned fields/entities include:

- `complaint_number`
- opened-by user
- related job/request/provider references
- category
- description
- priority
- requested resolution
- status
- assigned admin
- escalation metadata
- resolution
- customer-visible summary
- evidence links
- complaint status/timeline history

### Reviews

Canonical fields include:

- `job_id`
- `customer_id`
- `provider_id`
- `quality`
- `punctuality`
- `communication`
- `value_for_money`
- `overall_rating`
- `would_recommend`
- feedback
- moderation status
- edited timestamps/history as required

### Review responses

Logical entity `review_responses`.

### Review flags

Logical entity `review_flags`.

---

## 22. API Requirements

Synchronized API surface is maintained in `STEP_7_API_CONTRACTS.md` and `docs/api/API_CATALOGUE.md`.

Required operations include:

```text
POST   /complaints
GET    /me/complaints
GET    /complaints/{id}
POST   /complaints/{id}/evidence
POST   /complaints/{id}/updates

POST   /jobs/{job_id}/review
GET    /me/reviews
PATCH  /reviews/{id}
DELETE /reviews/{id}                    [policy controlled]
POST   /reviews/{id}/response
PATCH  /reviews/{id}/response           [policy controlled]
POST   /reviews/{id}/flag

GET    /admin/complaints
POST   /admin/complaints/{id}/assign
POST   /admin/complaints/{id}/escalate
POST   /admin/complaints/{id}/resolve
POST   /admin/reviews/{id}/moderate
```

All endpoints require ownership/relationship/permission/state validation.

---

## 23. Acceptance Criteria

1. Customer can file complaint from eligible active/completed job.
2. Job-linked complaint cannot target unrelated provider/job.
3. Complaint receives unique reference.
4. Complaint evidence remains private.
5. Customer can track complaint history.
6. Safety complaint can be escalated and audited.
7. Refund/compensation request does not trigger platform repair-payment refund logic.
8. Only eligible completed/finalized jobs create verified reviews.
9. Duplicate verified review for same job is rejected.
10. New reviews use exactly four canonical dimensions.
11. Overall rating is calculated consistently from those four dimensions.
12. Removed/invalidated reviews are excluded from provider aggregate.
13. Provider can respond only to its own related reviews.
14. Provider cannot alter customer review/rating.
15. Flagging creates moderation workflow rather than automatic removal.
16. Admin moderation requires permission and audit.
17. Edit/delete windows are configuration-driven.
18. Rating colour is not the sole accessibility signal.
19. Notifications respect applicable preferences/policy.

---

## 24. Remaining Configurable Decisions

Still configurable rather than hard-coded:

- review edit window
- review deletion/request-deletion window
- provider response edit policy/window
- complaint media limits
- complaint service target/SLA
- provider-profile complaints without a job
- exact complaint messaging/update UX

### Resolved during synchronization

The following is **no longer open**:

- rating dimension count: **four dimensions**
- `professionalism` as canonical new-review field: **not used for new MVP reviews**
- overall rating source: **calculated from four dimensions by default**

---

## 25. Implementation Rule

Migration 0009 and related APIs/UI must implement this synchronized four-dimension review model while preserving all approved security, authorization, geographic, payment and job-workflow rules.