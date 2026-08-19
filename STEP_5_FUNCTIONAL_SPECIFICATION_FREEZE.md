# iFixIt — Step 5: Functional Specification Freeze

**Document Type:** Pre-Database Functional Baseline  
**Status:** Draft for approval  
**Version:** 1.0  
**Date:** 2026-08-19

---

## 1. Purpose

This document freezes the functional baseline before database and API design. It connects approved use cases and UI behavior to required fields, permissions, state changes, data effects, notifications, and audit requirements.

A developer must not invent new business behavior during implementation without updating this specification.

---

## 2. Traceability Rule

Every production function must trace through:

`Business Use Case → Functional Use Case → Detailed Use Case → Screen → Action → Permission → State Change → Data Effect → Notification → Audit/Test`

No screen action should exist without a use case. No protected use case should exist without an authorization rule.

---

## 3. Functional Domains

1. Authentication & Accounts
2. Customer Profiles
3. Provider Onboarding
4. Verification & Approval
5. Service Catalogue
6. Locations & Service Areas
7. Provider Availability
8. Search & Discovery
9. Repair Requests
10. Matching & Assignment
11. Inspections
12. Quotations
13. Repair Jobs
14. Parts & Labour
15. Completion & Customer Confirmation
16. Warranty & Claims
17. Reviews
18. Complaints & Disputes
19. Subscriptions
20. Payments
21. Notifications
22. Admin Operations
23. Reporting
24. Audit & Security

---

## 4. Functional Action Matrix

### 4.1 Authentication

| Action | Actor | UI | Preconditions | State/Data Effect | Notification | Audit |
|---|---|---|---|---|---|---|
| Request OTP | Visitor | Login | Valid supported phone | OTP challenge created | OTP | Auth event |
| Verify OTP | User | OTP Verify | Active challenge | Session created | None | Auth success/failure |
| Logout | Authenticated user | Account/Menu | Active session | Session revoked | None | Optional security event |
| Change phone | Customer/Provider | Profile | Re-authentication | Verified phone updated | OTP/security notice | Required |

### 4.2 Customer Repair Request

| Action | Actor | UI | Preconditions | State/Data Effect | Notification | Audit/History |
|---|---|---|---|---|---|---|
| Start request | Customer | Request Repair | Logged in | Draft created | None | Draft metadata |
| Select service | Customer | Request form | Active exact service | Draft updated | None | No |
| Add details | Customer | Request form | Valid fields | Draft updated | None | No |
| Upload media | Customer | Upload component | Valid type/size | Attachment linked | None | File metadata |
| Submit request | Customer | Review/Submit | Mandatory data valid | `SUBMITTED`; ticket created | Customer confirmation | Status history |
| Cancel request | Customer/Admin | Repair detail | Cancellable state | `CANCELLED` | Provider/admin as relevant | Status history + reason |

### 4.3 Matching & Assignment

| Action | Actor | Preconditions | Effect | Notification | Audit |
|---|---|---|---|---|---|
| Calculate eligible providers | System | Submitted/open request | Ranked eligible set | None | Diagnostic metadata optional |
| Send lead | System | Eligible provider | Lead created/sent | Provider | Lead history |
| Accept lead | Provider | Lead active; provider eligible | Accepted/assignment created | Customer | Atomic history |
| Decline lead | Provider | Lead active | Declined | Optional | Lead history |
| Manual assignment | Admin | Provider eligible | Assignment created | Customer/provider | Required |
| Reassignment | Admin | Allowed state | Old assignment closed; new assignment created | Customer/providers | Required + reason |

### 4.4 Inspection & Diagnosis

| Action | Actor | Preconditions | Effect | Notification | History |
|---|---|---|---|---|---|
| Schedule inspection | Provider | Accepted job | `INSPECTION_SCHEDULED` | Customer | Status history |
| Start inspection | Provider | Scheduled/allowed | Inspection `IN_PROGRESS` | Optional | Inspection history |
| Record diagnosis | Provider | Assigned job | Diagnosis saved | Optional | Revision metadata |
| Complete inspection | Provider | Required fields valid | `INSPECTED` / quote path | Customer if configured | Status history |

### 4.5 Quotation

| Action | Actor | Preconditions | Effect | Notification | Audit/History |
|---|---|---|---|---|---|
| Create draft quote | Provider | Inspected/allowed job | Draft quote/version | None | Version metadata |
| Submit quote | Provider | Valid totals/items | `SUBMITTED` | Customer | Quote history |
| View quote | Customer | Own job | May become `VIEWED` | None | View timestamp optional |
| Approve quote | Customer | Current, unexpired submitted version | `APPROVED`; job repair-ready | Provider | Approval timestamp/version |
| Reject quote | Customer | Current submitted quote | `REJECTED` | Provider | Reason optional/history |
| Revise quote | Provider | Revision allowed | New version becomes current | Customer | Previous version preserved |

### 4.6 Repair Job

| Action | Actor | Preconditions | Effect | Notification | History |
|---|---|---|---|---|---|
| Start repair | Provider | Required approval complete | `IN_PROGRESS` | Customer | Required |
| Add progress | Provider | Active job | Progress event appended | Customer if visible | Append-only |
| Waiting for parts | Provider | Active job | `WAITING_FOR_PARTS` | Customer | Required |
| Resume repair | Provider | Waiting/on hold | `IN_PROGRESS` | Customer | Required |
| Add part | Provider | Active job | Job part record | Optional | Required data trace |
| Add labour | Provider | Active job | Labour record | Optional | Required data trace |
| Complete repair | Provider | Valid active state | `REPAIR_COMPLETED` / `CUSTOMER_CONFIRMATION` | Customer | Required |
| Confirm completion | Customer | Awaiting confirmation | `FINALIZED` | Provider | Required |
| Dispute completion | Customer | Awaiting confirmation/allowed window | `DISPUTED`; complaint linked | Admin/provider | Required |

### 4.7 Warranty, Review, Complaint

| Action | Actor | Preconditions | Effect | Notification | Audit |
|---|---|---|---|---|---|
| Activate warranty | System/Provider | Finalized eligible repair | Warranty `ACTIVE` | Customer | Warranty history |
| Submit warranty claim | Customer | Own active warranty | Claim opened | Provider/admin | Claim history |
| Submit review | Customer | Eligible finalized job | Verified review created | Provider | Uniqueness enforced |
| Moderate review | Admin | Permission | Visibility state changed | Optional | Required + reason |
| Submit complaint | Customer/Provider | Related context | `OPEN` | Admin | Required |
| Resolve complaint | Admin | Under review | `RESOLVED/REJECTED` | Parties | Required + reason |

### 4.8 Provider Eligibility

Provider marketplace eligibility is true only when all required conditions are satisfied:

`Approved AND AccountActive AND RequiredVerificationValid AND QualifyingSubscription AND NOT Suspended`

Repair matching additionally requires:

`ExactServiceMatch AND LocationMatch AND AcceptingLeads`

Availability/ranking affects order and selection, not security eligibility.

---

## 5. Required Field Freeze

### Customer Profile
- full_name
- verified_phone
- email optional
- default_location optional
- notification_preferences

### Provider Profile
- provider_type
- public_name
- business_name conditional
- representative conditional
- description
- years_experience optional
- logo/photo optional
- approval_status
- suspension_status
- availability
- accepting_leads

### Repair Request
- ticket_id
- customer
- exact_service
- item/equipment_type
- brand optional
- model optional
- serial optional
- problem_description
- location
- address/access_notes
- urgency
- preferred_schedule optional
- media
- status
- created_at

### Inspection
- job
- scheduled_at
- started_at
- completed_at
- diagnosis
- fault_identified
- recommended_repair
- estimated_parts
- estimated_labour
- estimated_duration
- notes/media

### Quotation
- job
- version
- status
- labour_items
- parts_items
- fees
- discount
- tax if applicable
- total
- estimated_duration
- expiry
- notes
- submitted_at
- approved/rejected_at

### Job Completion
- completion_notes
- final_parts
- final_labour
- final_media
- warranty_terms if offered
- completed_at
- customer_confirmation_at

---

## 6. UI Visibility Freeze

- UI visibility never replaces server authorization.
- Buttons must be hidden or disabled when an action is impossible, but API must independently reject unauthorized/invalid actions.
- Customer sees only own private repair data.
- Provider sees only public data and data necessary for assigned/eligible work.
- Admin menus/actions are permission driven.
- Suspended provider loses new marketplace exposure immediately.
- Expired subscription blocks new marketplace eligibility while preserving historical/active job access.

---

## 7. Notification Freeze

Mandatory event classes:
- OTP/security
- request submitted
- provider assigned/accepted
- inspection scheduled/completed
- quote submitted/approved/rejected/revised
- repair started
- waiting for parts/resumed
- repair completed
- customer confirmation required
- dispute/complaint updates
- warranty/claim updates
- subscription renewal/expiry
- verified payment success/failure

Channels are adapter driven: in-app, SMS, email, WhatsApp where integrated.

---

## 8. Audit Freeze

Mandatory audited actions:
- provider verification decisions
- provider approval/rejection/suspension/reactivation
- manual assignment/reassignment
- privileged job state correction
- subscription override
- payment correction/reconciliation
- service/location master changes
- review moderation
- complaint resolution
- warranty administrative change
- critical configuration change

Each audit event must capture actor, action, entity, previous/new value where applicable, reason, timestamp, and correlation/request ID.

---

## 9. Open Decisions Before Database Freeze

The following must be explicitly resolved or configured:

1. Lead distribution model.
2. Direct-provider booking timeout/fallback.
3. Cancellation cutoffs after inspection/quote approval/repair start.
4. Auto-finalization period after provider completion.
5. Warranty first-line handling.
6. Customer repair-payment scope (recommended outside MVP initially).
7. Business-provider staff management scope.

Until changed, Step 3 recommendations are the default design assumptions.

---

## 10. Step 5 Approval Gate

- [ ] Step 3 use cases aligned
- [ ] Step 4 UI aligned
- [ ] Actions mapped to actors/screens
- [ ] Required fields approved
- [ ] Business rules approved
- [ ] State effects approved
- [ ] Notification triggers approved
- [ ] Audit requirements approved
- [ ] Open decisions resolved/deferred

After approval, proceed to Step 6 Database Schema & Data Dictionary.
