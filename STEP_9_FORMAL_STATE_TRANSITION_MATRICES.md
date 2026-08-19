# iFixIt — Step 9: Formal State Transition Matrices

**Document Type:** Workflow Enforcement Specification  
**Status:** Draft for approval  
**Version:** 1.0  
**Date:** 2026-08-19

---

## 1. Purpose

Defines allowed state transitions and responsible actors. Any transition not listed is denied unless performed by an explicitly authorized administrative correction workflow.

All accepted transitions create status-history/audit records as applicable.

---

## 2. Provider Lifecycle

| From | To | Actor | Preconditions |
|---|---|---|---|
| DRAFT | PENDING_VERIFICATION | Provider | Required profile/application submitted |
| PENDING_VERIFICATION | INFORMATION_REQUIRED | Admin | More evidence required |
| INFORMATION_REQUIRED | PENDING_VERIFICATION | Provider | New evidence submitted |
| PENDING_VERIFICATION | PENDING_APPROVAL | System/Admin | Required verification satisfied |
| PENDING_APPROVAL | APPROVED | Admin | Approval prerequisites valid |
| PENDING_APPROVAL | REJECTED | Admin | Reason required |
| APPROVED | SUSPENDED | Admin | Reason + permission |
| SUSPENDED | APPROVED | Admin | Suspension resolved; eligibility recalculated |

Rules:
- provider cannot self-approve or self-unsuspend
- approval does not bypass subscription
- suspension blocks new marketplace eligibility

---

## 3. Verification Lifecycle

| From | To | Actor |
|---|---|---|
| NOT_SUBMITTED | SUBMITTED | Provider |
| SUBMITTED | UNDER_REVIEW | Admin/System |
| UNDER_REVIEW | VERIFIED | Admin |
| UNDER_REVIEW | INFORMATION_REQUIRED | Admin |
| INFORMATION_REQUIRED | SUBMITTED | Provider |
| UNDER_REVIEW | REJECTED | Admin |
| VERIFIED | EXPIRED | System |
| VERIFIED | REVOKED | Admin |

---

## 4. Repair Request Lifecycle

| From | To | Actor | Notes |
|---|---|---|---|
| DRAFT | SUBMITTED | Customer | Mandatory fields valid |
| SUBMITTED | MATCHING | System | Matching begins |
| MATCHING | OPEN | System | Awaiting provider response |
| MATCHING/OPEN | ASSIGNED | System/Admin | Provider selected |
| ASSIGNED | ACCEPTED | Provider | Current assignment accepted |
| ACCEPTED | JOB_CREATED | System | Job created idempotently |
| DRAFT | CANCELLED | Customer | Allowed |
| SUBMITTED | CANCELLED | Customer/Admin | Allowed by cancellation policy |
| MATCHING/OPEN | CANCELLED | Customer/Admin | Allowed by cancellation policy |
| MATCHING/OPEN | EXPIRED | System | No provider/timeout policy |

Forbidden examples:
- CANCELLED → SUBMITTED
- EXPIRED → ACCEPTED without a formal reopen action
- JOB_CREATED → DRAFT

---

## 5. Lead Lifecycle

| From | To | Actor |
|---|---|---|
| PENDING | SENT | System |
| SENT | VIEWED | Provider/System |
| SENT/VIEWED | ACCEPTED | Provider |
| SENT/VIEWED | DECLINED | Provider |
| SENT/VIEWED | EXPIRED | System |
| PENDING/SENT/VIEWED | CLOSED | System/Admin |

Rule: expired/closed lead cannot later be accepted.

---

## 6. Assignment Lifecycle

| From | To | Actor |
|---|---|---|
| PENDING | ACCEPTED | Provider |
| PENDING | DECLINED | Provider |
| PENDING | EXPIRED | System |
| PENDING/ACCEPTED | REASSIGNED | Admin |
| ACCEPTED | COMPLETED | System when job finalized |
| PENDING/ACCEPTED | CANCELLED | Admin/System as policy allows |

Exclusive assignment acceptance must be atomic.

---

## 7. Inspection Lifecycle

| From | To | Actor |
|---|---|---|
| NOT_SCHEDULED | SCHEDULED | Provider |
| SCHEDULED | IN_PROGRESS | Provider |
| IN_PROGRESS | COMPLETED | Provider |
| SCHEDULED | CANCELLED | Provider/Admin if policy permits |
| CANCELLED | SCHEDULED | Provider/Admin only through explicit reschedule flow |

---

## 8. Quotation Lifecycle

| From | To | Actor | Rule |
|---|---|---|---|
| DRAFT | SUBMITTED | Provider | Totals validated server-side |
| SUBMITTED | VIEWED | Customer/System | Optional view tracking |
| SUBMITTED/VIEWED | APPROVED | Customer | Current unexpired version only |
| SUBMITTED/VIEWED | REJECTED | Customer | Current version only |
| SUBMITTED/VIEWED | EXPIRED | System | Expiry reached |
| DRAFT/SUBMITTED | CANCELLED | Provider/Admin | State-dependent |
| REJECTED/EXPIRED | DRAFT(new version) | Provider | New version; old history preserved |
| SUBMITTED/VIEWED | DRAFT(new version) | Provider | Revision allowed; customer must re-approve |

Approval is version-specific. A replaced version cannot be approved.

---

## 9. Repair Job Lifecycle

Primary path:

`ASSIGNED → ACCEPTED → INSPECTION_SCHEDULED → INSPECTED → QUOTE_PENDING → QUOTE_APPROVED → REPAIR_SCHEDULED → IN_PROGRESS → REPAIR_COMPLETED → CUSTOMER_CONFIRMATION → FINALIZED`

Formal transitions:

| From | To | Actor | Preconditions |
|---|---|---|---|
| ASSIGNED | ACCEPTED | Provider | Active assignment |
| ACCEPTED | INSPECTION_SCHEDULED | Provider | Inspection required |
| INSPECTION_SCHEDULED | INSPECTED | Provider | Inspection completed |
| INSPECTED | QUOTE_PENDING | System/Provider | Quote required |
| QUOTE_PENDING | QUOTE_APPROVED | Customer/System | Current quote approved |
| QUOTE_APPROVED | REPAIR_SCHEDULED | Provider | Scheduling used |
| QUOTE_APPROVED/REPAIR_SCHEDULED | IN_PROGRESS | Provider | Repair prerequisites valid |
| IN_PROGRESS | WAITING_FOR_PARTS | Provider | Reason/part context |
| WAITING_FOR_PARTS | IN_PROGRESS | Provider | Resume action |
| IN_PROGRESS | ON_HOLD | Provider/Admin | Reason required |
| ON_HOLD | IN_PROGRESS | Provider/Admin | Resume reason/context |
| IN_PROGRESS | REPAIR_COMPLETED | Provider | Completion requirements valid |
| REPAIR_COMPLETED | CUSTOMER_CONFIRMATION | System | Confirmation requested |
| CUSTOMER_CONFIRMATION | FINALIZED | Customer/System | Confirm or approved auto-finalize policy |
| CUSTOMER_CONFIRMATION | DISPUTED | Customer | Report problem |
| DISPUTED | FINALIZED | Admin/System | Resolution permits closure |
| Active allowed states | CANCELLED | Customer/Provider/Admin | Explicit cancellation policy |
| Active allowed states | UNABLE_TO_REPAIR | Provider/Admin | Reason required |

Rules:
- no repair start before required quote approval
- completed/finalized jobs cannot be casually cancelled
- admin correction uses separate privileged audited action

---

## 10. Complaint Lifecycle

| From | To | Actor |
|---|---|---|
| OPEN | UNDER_REVIEW | Admin |
| UNDER_REVIEW | WAITING_FOR_CUSTOMER | Admin |
| WAITING_FOR_CUSTOMER | UNDER_REVIEW | Customer/Admin |
| UNDER_REVIEW | WAITING_FOR_PROVIDER | Admin |
| WAITING_FOR_PROVIDER | UNDER_REVIEW | Provider/Admin |
| UNDER_REVIEW | RESOLVED | Admin |
| UNDER_REVIEW | REJECTED | Admin |
| RESOLVED/REJECTED | CLOSED | Admin/System |

Reason required for final resolution/rejection.

---

## 11. Warranty Lifecycle

Warranty:

| From | To | Actor |
|---|---|---|
| ACTIVE | EXPIRED | System |
| ACTIVE | VOID | Admin/authorized policy action |
| ACTIVE | CLAIMED | System when valid claim submitted |
| CLAIMED | ACTIVE | System/Admin if claim closes and warranty remains valid |
| CLAIMED | EXPIRED | System if coverage period ends |

Warranty Claim:

`OPEN → UNDER_REVIEW → ACCEPTED / REJECTED → REMEDIAL_WORK / RESOLVED → CLOSED`

Exact operational ownership follows Step 5 final decision.

---

## 12. Subscription Lifecycle

| From | To | Actor |
|---|---|---|
| PENDING_PAYMENT | ACTIVE | System | Verified payment success |
| TRIAL | ACTIVE | System/Admin | Valid conversion |
| ACTIVE | RENEWAL_DUE | System | Threshold reached |
| RENEWAL_DUE | ACTIVE | System | Verified renewal |
| RENEWAL_DUE | GRACE_PERIOD | System | Expiry + grace policy |
| GRACE_PERIOD | ACTIVE | System | Verified renewal |
| GRACE_PERIOD | EXPIRED | System | Grace ended |
| ACTIVE/RENEWAL_DUE | EXPIRED | System | No grace or expiry policy |
| ACTIVE | SUSPENDED | Admin/System | Policy action |
| SUSPENDED | ACTIVE | Admin | Suspension resolved, dates valid |
| EXPIRED | ACTIVE | System | Verified renewal |
| ACTIVE | CANCELLED | Provider/Admin | Cancellation policy |

---

## 13. Payment Lifecycle

| From | To | Actor |
|---|---|---|
| INITIATED | PENDING | System/Gateway |
| PENDING | SUCCEEDED | Gateway/System | Authoritative verification |
| PENDING | FAILED | Gateway/System |
| PENDING | REQUIRES_REVIEW | System/Admin | Mismatch/uncertain state |
| REQUIRES_REVIEW | SUCCEEDED | Admin/System | Evidence verified |
| REQUIRES_REVIEW | FAILED | Admin/System | Evidence confirms failure |
| SUCCEEDED | REFUNDED | Gateway/Admin |
| SUCCEEDED | REVERSED | Gateway/System |

Browser redirect never directly performs `PENDING → SUCCEEDED`.

---

## 14. Review Moderation Lifecycle

`PUBLISHED → HIDDEN → PUBLISHED`

Optional policy states: `PENDING_MODERATION`, `REMOVED`.

All admin moderation transitions require reason and audit.

---

## 15. Concurrency Rules

1. Request cancellation vs provider acceptance: first valid atomic transition wins; second receives conflict.
2. Two exclusive provider acceptances: only one can commit.
3. Quote revision vs customer approval: approval must check current version/lock.
4. Duplicate payment webhook: unique event key; one entitlement effect.
5. Duplicate request submission: one logical request.
6. Duplicate review submission: DB unique job review constraint.
7. Conflicting admin updates: optimistic version check or row lock.

Recommended API conflict response: HTTP `409` with stable business error code.

---

## 16. Administrative Correction Rule

`job.correct_state` and equivalent privileged corrections are not normal transitions.

Requirements:
- high-privilege permission
- current state displayed
- target state validated against correction policy
- mandatory reason
- previous state retained
- audit event
- relevant notifications if customer/provider-facing state changes

---

## 17. Step 9 Approval Gate

- [ ] Provider transitions approved
- [ ] Repair request transitions approved
- [ ] Lead/assignment transitions approved
- [ ] Inspection transitions approved
- [ ] Quotation transitions approved
- [ ] Job transitions approved
- [ ] Complaint/warranty transitions approved
- [ ] Subscription/payment transitions approved
- [ ] Concurrency behavior approved
- [ ] Admin correction behavior approved

After approval, proceed to Step 10 Test Cases & Acceptance Criteria.
