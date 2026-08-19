# iFixIt — Step 13: Customer Complaint & Rating System Gap Specification

**Document Type:** Gap / Detailed Functional Specification  
**Status:** Implementation Baseline Input  
**Version:** 1.0  
**Date:** 2026-08-19

---

## 1. Purpose

This document records only the complaint, rating, review-response, and moderation requirements that were not already fully represented in the existing iFixIt specification set.

Existing complaint/review state machines, permissions, audit rules, customer ownership rules, notification architecture, and MVP payment scope remain authoritative. This document supplements them rather than replacing them.

---

## 2. Additional Complaint Entry Points

The following customer complaint entry points must be explicitly supported in the UI:

1. **Job History** — `File Complaint` on an eligible completed/historical job.
2. **Active Job Detail** — `File Complaint` while a job is still active where policy permits.
3. **Provider Profile** — `Report an Issue / File Complaint`. If the complaint is job-related, the customer should select the relevant platform job.
4. **My Complaints / Support** — customer can view complaint history and start a new eligible complaint.

Complaint creation requires authentication.

A job-linked complaint must derive the customer/provider relationship from the selected job; a customer must not be able to fabricate an unrelated provider-job association.

---

## 3. Complaint Form Additions

### 3.1 Complaint Categories

Explicit customer complaint categories:

- `PROVIDER_NO_SHOW`
- `POOR_WORKMANSHIP`
- `UNEXPECTED_PRICING`
- `UNSAFE_BEHAVIOUR`
- `INCORRECT_INFORMATION`
- `PROPERTY_DAMAGE`
- `UNPROFESSIONAL_CONDUCT`
- `OTHER`

`UNSAFE_BEHAVIOUR` should support elevated priority/escalation.

### 3.2 Complaint Evidence

Customer may attach complaint evidence:

- photos — configurable maximum; initial UX recommendation up to 5
- short video — configurable maximum; initial UX recommendation up to 30 seconds
- other permitted evidence/document types where enabled

Complaint evidence must be private, authorization-controlled, and linked to the complaint case.

### 3.3 Requested Outcome

Allow the customer to record a preferred resolution:

- provider redo/remediation
- mutual agreement
- refund requested from provider
- compensation requested from provider
- other

**MVP payment rule:** refund/compensation selections are customer-requested outcomes only. iFixIt does not claim to issue repair refunds or compensation while customer-to-provider repair settlement remains outside the platform.

---

## 4. Complaint Reference & Confirmation UX

Each submitted complaint must have a human-readable reference such as:

`CMP-2026-000042`

The confirmation screen should show:

- complaint reference
- provider/job context
- submission timestamp
- current status
- short explanation of what happens next
- link to `My Complaints`

Do not promise a fixed 24–48 hour resolution unless an operational SLA is separately approved. The UI may show a configurable service target.

---

## 5. Customer Complaint Tracking

Add a customer-facing **My Complaints** screen showing:

- complaint reference
- related provider
- related job/service
- complaint type
- filed date
- current status
- latest customer-visible update
- `View Details`

Complaint detail should provide a chronological customer-visible case timeline.

---

## 6. Expanded Complaint Status Presentation

The existing complaint state machine remains authoritative, but the UI should support these operational/customer-facing labels where mapped to canonical states:

- New
- Under Review
- Waiting for / Contacted Customer
- Waiting for / Contacted Provider
- Evidence Gathering
- Resolution Offered
- Resolved
- Closed
- Escalated

Do not create duplicate database states merely for presentation if an existing canonical state can represent the condition. Use status reason/substate/history where appropriate.

---

## 7. Complaint Priority & Escalation

Complaint processing should support priority classification such as:

- Critical
- High
- Medium
- Normal

Safety-related complaints, credible property-damage incidents, threats, fraud indicators, or repeated serious provider complaints may be escalated according to admin policy.

Escalation must be auditable.

---

## 8. Rating Dimensions — Reconciliation

The previously defined iFixIt review model included five detailed dimensions. The newly supplied business guide specifies four dimensions plus overall rating.

For consistency and simpler MVP UX, Step 13 recommends the following customer-visible rating dimensions:

1. **Quality** — workmanship quality
2. **Punctuality** — timeliness
3. **Communication** — responsiveness/clarity
4. **Value for Money** — value relative to price/service

`overall_rating` should be calculated from the four dimensions unless a separately approved design allows the customer to submit an independent overall score.

Recommended calculation:

`overall_rating = (quality + punctuality + communication + value_for_money) / 4`

If the existing database retains `professionalism`, it may be deprecated, retained for backward compatibility, or folded into Quality/Communication during schema synchronization. This is a reconciliation item that must be resolved before implementation.

---

## 9. Rating Eligibility & Prompting

Only an eligible completed/finalized platform job may generate a verified service review.

Add explicit rating entry points:

- automatic prompt after eligible job completion/finalization
- `Rate Now` from Job History
- optional `Remind Me Later`

One verified review per eligible job remains the default rule.

The UI must not show `Rate Again` as a second review. If edits are allowed, the action should be `Edit Review`.

---

## 10. Review Form Additions

Review form should support:

- four rating dimensions
- calculated overall rating
- written review text
- optional completed-work photos
- optional `Would recommend this provider` boolean
- submit
- skip/remind later

Review photos must use the existing media security/visibility model.

---

## 11. Provider Rating Aggregation

Provider public rating should be derived from eligible published/visible verified reviews.

Recommended aggregates:

- overall average
- Quality average
- Punctuality average
- Communication average
- Value for Money average
- review count

Aggregation rules must exclude removed/invalidated reviews and must avoid double-counting edited versions.

Do not store a manually editable provider rating as the source of truth. Cached aggregates are permitted if recalculable from review records.

---

## 12. Rating Display Rules

Customer-facing profiles/search cards may display:

- average overall rating
- review count
- star representation
- verification badge on reviews where eligible
- dimension breakdown on provider profile

Colours may supplement the rating but must never be the only signal; numeric/text values remain visible for accessibility.

---

## 13. Verified Review Badge

A review receives `Verified Service` status only when:

- customer is authenticated
- review is linked to an eligible iFixIt job
- customer owns/participated in that job
- job reached the required completion/finalization state
- review has not been invalidated by moderation

No manual/free-standing public review should receive a verified-service badge.

---

## 14. Provider Response to Reviews

Add provider review-response functionality.

Provider may:

- view reviews about their own completed jobs/profile
- submit one public response per review, subject to policy
- edit their response if policy permits
- flag a review for moderation
- request admin review/removal

Provider response fields should include:

- review_id
- provider_id
- response_text
- created_at
- updated_at
- moderation_status if required

Provider cannot alter the customer's rating or review text.

---

## 15. Customer Review Management

Support architecture for:

- `View My Reviews`
- edit own review within a configurable policy window
- delete/request deletion within a configurable policy window
- show edited indicator after material update

The supplied guide proposes 30 days to edit and 7 days to delete. These values are **not frozen** and should be configuration/policy decisions rather than hard-coded constants until approved.

Review edit history should be retained where required for moderation/audit integrity.

---

## 16. Review Flagging

Both customer and provider may flag inappropriate review content where relevant.

Flag reasons may include:

- abusive/offensive content
- personal/private information
- spam
- fraud/fabrication
- unrelated content
- harassment
- other policy violation

Flagging creates a moderation case/event; it does not automatically remove the review.

---

## 17. Review Moderation

Admin moderation actions should support:

- keep/publish
- hide pending review
- remove from public display
- restore
- warn user
- suspend/restrict account under separate account policy

Avoid silently editing the substantive meaning of a customer's review. If redaction of prohibited personal data is supported, retain original content privately, record the redaction, actor, reason, and timestamp.

Every moderation action must be auditable.

---

## 18. Review Guidelines / Content Policy

Customer review guidance should explicitly encourage:

- honest factual description
- comments about actual work performed
- punctuality
- communication
- value/price experience
- optional relevant work photos

Disallow or moderate:

- abusive/threatening language
- unnecessary personal information
- knowingly false/fabricated claims
- spam/unrelated advertising
- harassment/discrimination
- illegal content

---

## 19. Notifications Additions

Add explicit notification events for:

### Customer
- complaint submitted
- complaint status changed
- admin requests more information
- resolution offered
- complaint resolved/closed
- review reminder
- provider responds to review
- review moderation outcome where relevant

### Provider
- complaint opened against provider when disclosure is permitted
- admin requests provider evidence/information
- complaint status/resolution update
- new review
- review flag/moderation outcome

### Admin
- new complaint
- critical/safety complaint
- escalation
- flagged review

Channels remain governed by the existing notification adapter/preferences architecture.

---

## 20. Suggested Data Model Additions

These are additive requirements to be synchronized into Step 6 rather than a replacement schema.

### Complaint additions

Recommended fields/entities:

- `complaint_no`
- `priority`
- `requested_resolution`
- `escalated_at`
- `escalated_by`
- `customer_visible_status_summary`
- complaint evidence links through existing media tables
- complaint timeline/history events

### Review additions

Recommended fields:

- `quality`
- `punctuality`
- `communication`
- `value_for_money`
- `overall_rating`
- `would_recommend`
- `edited_at`
- `moderation_status`

### Review responses

New logical entity `review_responses`:

- `id`
- `review_id`
- `provider_id`
- `response_text`
- `moderation_status`
- `created_at`
- `updated_at`

### Review flags

New logical entity `review_flags`:

- `id`
- `review_id`
- `reported_by_user_id`
- `reason_code`
- `details`
- `status`
- `created_at`
- `resolved_at`
- `resolved_by`

---

## 21. Suggested API Additions

To synchronize into Step 7:

```text
POST   /complaints
GET    /me/complaints
GET    /complaints/{complaint_id}
POST   /complaints/{complaint_id}/evidence
POST   /complaints/{complaint_id}/messages-or-updates   [if supported]

POST   /jobs/{job_id}/review
PATCH  /reviews/{review_id}
DELETE /reviews/{review_id}                             [policy-controlled]
GET    /me/reviews
POST   /reviews/{review_id}/response
PATCH  /reviews/{review_id}/response
POST   /reviews/{review_id}/flag

GET    /admin/complaints
PATCH  /admin/complaints/{complaint_id}
POST   /admin/complaints/{complaint_id}/escalate
POST   /admin/reviews/{review_id}/moderate
```

All endpoints require existing ownership/relationship/permission rules.

---

## 22. Acceptance Criteria Additions

Add to Step 10 testing:

1. Customer can file a complaint from an eligible active/completed job.
2. Customer cannot file a job-linked complaint against an unrelated provider.
3. Complaint receives unique human-readable reference.
4. Complaint evidence remains private to authorized participants/admins.
5. Customer can track complaint status/history.
6. Safety complaint can be elevated/flagged for priority handling.
7. Requested refund/compensation does not trigger platform payment/refund logic in MVP.
8. Only eligible completed jobs can create verified reviews.
9. Duplicate verified review for same job is rejected.
10. Overall rating is calculated consistently from approved dimensions.
11. Removed reviews are excluded from provider aggregate rating.
12. Provider can respond only to reviews related to that provider.
13. Provider cannot alter customer rating/review.
14. Review flag creates moderation workflow rather than automatic deletion.
15. Admin moderation action requires permission and audit record.
16. Review edit/delete windows are enforced from configuration once policy is approved.
17. Rating colour is not the sole accessibility signal.
18. Complaint/review notifications respect notification preferences except mandatory safety/security notices where policy allows.

---

## 23. Items Already Covered Elsewhere — Not Duplicated as New Rules

The following already exist in the iFixIt blueprint and remain authoritative:

- customer and provider complaint capability
- complaint investigation/admin resolution
- complaint state/history architecture
- customer dispute on repair completion
- verified job review principle
- review moderation permission
- one review per eligible job
- review ownership/security
- provider/customer/admin access controls
- audit logging for complaint resolution/review moderation
- notifications framework
- media/object storage security
- customer repair payments outside MVP

---

## 24. Decisions Still Required

The following should remain configurable or undecided until explicitly approved:

- exact customer review edit window
- exact customer review deletion policy/window
- whether provider responses can be edited and for how long
- exact complaint media limits
- exact complaint service-level target
- whether public provider profile complaints are allowed without a related job
- whether an independent overall rating is entered or always calculated
- final treatment of the legacy `professionalism` rating dimension
- whether customer/provider complaint messaging is in-platform or handled through support updates only

---

## 25. Implementation Rule

When Steps 4, 5, 6, 7, 8, 9, and 10 are synchronized, this document should be used as the detailed source for complaint/rating UX additions while preserving all previously approved security, authorization, geographic, payment, and workflow rules.