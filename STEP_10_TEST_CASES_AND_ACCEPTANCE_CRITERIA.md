# iFixIt — Step 10: Test Cases & Acceptance Criteria

**Document Type:** Pre-Coding QA & Acceptance Baseline  
**Status:** Draft for approval  
**Version:** 1.0  
**Date:** 2026-08-19

---

## 1. Purpose

Defines minimum acceptance criteria and representative test cases for iFixIt before implementation. Every major use case, permission rule and state transition must have positive, negative and authorization coverage.

---

## 2. Test Layers

1. Unit tests — calculations, eligibility, validation, state rules.
2. Service/integration tests — database transactions, permissions, idempotency.
3. API contract tests — request/response/error codes.
4. UI tests — screen states and interaction rules.
5. End-to-end tests — full customer/provider/admin journeys.
6. Security tests — ownership, privilege escalation, file access, rate limiting.
7. Performance tests — critical search, dashboard and API targets.
8. Recovery tests — retry, webhook replay, notification failure, partial dependency outage.

---

## 3. Authentication Acceptance

### TC-AUTH-001 Valid OTP Login
Given a valid phone and OTP challenge, when the correct unexpired OTP is submitted, then exactly one authenticated session is created.

### TC-AUTH-002 Invalid OTP
Wrong OTP must not authenticate user and must increment protected attempt count.

### TC-AUTH-003 Expired OTP
Expired challenge returns validation failure and creates no session.

### TC-AUTH-004 Consumed OTP
Previously successful challenge cannot be reused.

### TC-AUTH-005 Rate Limit
Repeated OTP requests beyond configured threshold return `429` and do not flood messaging provider.

### TC-AUTH-006 Phone Change
Verified phone cannot be directly overwritten without verification flow.

---

## 4. Customer Profile Acceptance

### TC-CUS-001 Own Profile
Customer can read/update allowed own profile fields.

### TC-CUS-002 Cross-Customer Access
Customer A cannot read/update Customer B profile even using B’s UUID.

### TC-CUS-003 Protected Field
Direct update of verified phone is rejected.

---

## 5. Search & Eligibility Acceptance

### TC-SEA-001 Exact Service Match
Only providers with active exact requested service appear.

### TC-SEA-002 Location Match
Provider not serving selected location is excluded.

### TC-SEA-003 Suspended Provider
Suspended provider never appears regardless of subscription, availability or rating.

### TC-SEA-004 Expired Subscription
Provider with non-qualifying expired subscription does not receive new marketplace exposure.

### TC-SEA-005 Unapproved Provider
Paid but unapproved provider does not appear.

### TC-SEA-006 Filter Safety
Applying filters/sorts cannot reintroduce an ineligible provider.

---

## 6. Repair Request Acceptance

### TC-REQ-001 Create Draft
Authenticated customer can start a draft request.

### TC-REQ-002 Mandatory Validation
Submission fails if exact service, description, location or other mandatory field is missing.

### TC-REQ-003 Disabled Service
A service disabled after form load is rejected at final server validation.

### TC-REQ-004 Ticket Generation
Successful submission creates one unique ticket and `SUBMITTED` history event.

### TC-REQ-005 Duplicate Submit
Double-click/network retry creates only one logical request.

### TC-REQ-006 Ownership
Customer cannot open another customer’s request by changing URL ID.

### TC-REQ-007 Cancel Allowed
Customer can cancel in an allowed state and history is preserved.

### TC-REQ-008 Cancel Forbidden
Customer cannot cancel after a prohibited lifecycle boundary.

---

## 7. Provider Onboarding Acceptance

### TC-PRV-001 Required Profile
Provider cannot submit incomplete required onboarding.

### TC-PRV-002 Exact Services
Duplicate provider-service mapping is prevented.

### TC-PRV-003 Service Areas
Duplicate provider-location mapping is prevented.

### TC-PRV-004 Pricing Validation
Fixed/hourly/starting pricing requiring amount rejects invalid negative/missing amount.

### TC-PRV-005 Approval Protection
Provider cannot self-set approval or suspension fields.

---

## 8. Verification & Admin Approval Acceptance

### TC-VER-001 Private Verification Document
Verification file is inaccessible to public/customer/unrelated provider.

### TC-VER-002 Admin Approval
Authorized admin can approve verification and audit event records actor/time.

### TC-VER-003 Unauthorized Admin
Admin without verification permission cannot approve verification.

### TC-VER-004 Rejection Reason
Verification rejection without reason fails validation.

### TC-ADM-PRV-001 Approve Provider
Approval succeeds only when prerequisites are satisfied.

### TC-ADM-PRV-002 Suspend Provider
Suspension immediately removes new marketplace eligibility while preserving active/history records.

---

## 9. Matching & Assignment Acceptance

### TC-MAT-001 Eligible Set
Matching returns only providers meeting all eligibility rules.

### TC-MAT-002 Manual Assignment Validation
Admin cannot silently assign suspended/ineligible provider through normal assignment flow.

### TC-MAT-003 Atomic Acceptance
For exclusive assignment, simultaneous accept attempts result in exactly one winner.

### TC-MAT-004 Expired Lead
Expired lead cannot be accepted.

### TC-MAT-005 Reassignment Audit
Reassignment requires reason and preserves previous assignment history.

---

## 10. Inspection Acceptance

### TC-INSP-001 Schedule
Assigned provider can schedule inspection; customer is notified.

### TC-INSP-002 Unauthorized Provider
Unrelated provider cannot update inspection.

### TC-INSP-003 Complete Inspection
Completion stores diagnosis and advances only to an allowed next state.

---

## 11. Quotation Acceptance

### TC-QUO-001 Server Totals
Server calculates/revalidates quotation totals and does not trust tampered client total.

### TC-QUO-002 Submit Quote
Only assigned provider can submit quote for job.

### TC-QUO-003 Approve Current Version
Customer can approve current unexpired submitted quote.

### TC-QUO-004 Expired Quote
Expired quote cannot be approved.

### TC-QUO-005 Old Version
Previous quote version cannot be approved after revision.

### TC-QUO-006 Revision History
Quote revision creates a new version and preserves old version.

### TC-QUO-007 Cross-Customer
Customer cannot view/approve another customer’s quotation.

---

## 12. Repair Job Acceptance

### TC-JOB-001 Start Preconditions
Repair cannot start before required inspection/quote approval.

### TC-JOB-002 Progress Append
Progress updates are appended and historical updates remain traceable.

### TC-JOB-003 Waiting Parts
Provider can mark waiting for parts and customer sees correct timeline state.

### TC-JOB-004 Resume
Waiting job can return to `IN_PROGRESS` only via valid resume action.

### TC-JOB-005 Complete
Completion requires required notes/final data and creates status history.

### TC-JOB-006 Customer Confirm
Only owning customer can finalize through confirmation.

### TC-JOB-007 Dispute
Customer dispute changes job to `DISPUTED` and creates/links complaint.

### TC-JOB-008 Subscription Expiry Mid-Job
Provider with expired subscription loses new work but retains access needed for existing active job according to policy.

### TC-JOB-009 Suspended Mid-Job
New leads blocked; existing job preserved for admin intervention/reassignment policy.

---

## 13. Parts & Labour Acceptance

### TC-PART-001 Valid Part
Positive quantity and valid amount are stored.

### TC-PART-002 Negative Quantity
Negative quantity is rejected.

### TC-LAB-001 Labour Amount
Labour record requires valid amount and job relationship.

### TC-PART-003 Finalized Job
Mutable parts/labour edits are blocked after finalization except privileged correction flow.

---

## 14. Warranty Acceptance

### TC-WAR-001 Activate Warranty
Eligible finalized repair can create active warranty with correct dates/terms.

### TC-WAR-002 Valid Claim
Owning customer can claim active warranty.

### TC-WAR-003 Expired Warranty
Expired warranty claim is rejected.

### TC-WAR-004 Cross-Customer
Customer cannot claim warranty belonging to another customer.

---

## 15. Reviews Acceptance

### TC-REV-001 Eligible Review
Customer can review own eligible finalized job.

### TC-REV-002 Duplicate Review
Second verified review for same job is blocked at database/service layer.

### TC-REV-003 Provider Cannot Edit Review
Provider cannot change customer review content.

### TC-REV-004 Moderation Audit
Admin hide/restore requires permission, reason and audit.

---

## 16. Complaints Acceptance

### TC-CMP-001 Open Complaint
Authorized participant can create complaint with valid category/description.

### TC-CMP-002 Admin Resolution
Resolution requires authorized admin and records reason/outcome/history.

### TC-CMP-003 Complaint Not Automatic Guilt
Opening complaint does not automatically suspend provider.

### TC-CMP-004 Private Evidence
Complaint evidence is not public.

---

## 17. Subscription Acceptance

### TC-SUB-001 Verified Activation
Subscription activates only from verified successful payment/approved entitlement source.

### TC-SUB-002 Expiry
Expired subscription blocks new marketplace eligibility.

### TC-SUB-003 Renewal
Verified renewal restores active entitlement and eligibility recalculates all conditions.

### TC-SUB-004 Admin Extension
Admin extension requires explicit permission, reason and audit.

---

## 18. Payment Acceptance

### TC-PAY-001 Server Amount
Client cannot change authoritative subscription amount.

### TC-PAY-002 Browser Return
Success query parameter/browser redirect does not activate subscription.

### TC-PAY-003 Valid Webhook
Valid signed gateway success updates payment once and activates entitlement when appropriate.

### TC-PAY-004 Invalid Signature
Invalid webhook signature produces no entitlement.

### TC-PAY-005 Duplicate Webhook
Replay of same external event has no duplicate entitlement effect.

### TC-PAY-006 Reconciliation
Uncertain payment can be reconciled by authorized flow with audit history.

---

## 19. Notifications Acceptance

### TC-NOT-001 Business Transaction Survives Notification Failure
If optional notification provider fails, valid repair transaction remains committed.

### TC-NOT-002 Retry
Failed notification retries according to bounded policy and records attempts.

### TC-NOT-003 No Duplicate Spam
Retry/idempotency prevents uncontrolled duplicate messages.

---

## 20. Admin & Permission Acceptance

### TC-PERM-001 UI Hidden
Unauthorized admin action is hidden/disabled in UI.

### TC-PERM-002 API Denied
Calling hidden admin endpoint directly still returns authorization failure.

### TC-PERM-003 Job Correction
Privileged correction requires permission + reason + audit.

### TC-PERM-004 Audit Read-Only
Normal admin UI cannot edit/delete audit history.

---

## 21. UI State Acceptance

Each major screen must implement:
- loading state
- success/content state
- empty state where relevant
- recoverable error + retry
- unauthorized state
- not-found state
- disabled state for invalid action
- mobile layout
- desktop layout
- status-dependent action visibility

Critical examples:
- quote pending shows Approve/Reject to owning customer only
- in-progress job hides quote approval actions
- repair completed shows Confirm/Report Problem to owning customer
- suspended provider dashboard explains loss of new marketplace eligibility without hiding historical jobs

---

## 22. Security Acceptance

Minimum checks:
- horizontal privilege escalation by UUID tampering
- vertical privilege escalation/admin permission bypass
- private-file signed access enforcement
- OTP brute-force/rate limiting
- session invalidation
- webhook signature verification
- injection-safe database access
- XSS-safe rendered user content
- CSRF protection where applicable to auth/session architecture
- secure headers/TLS
- secrets never sent to client/logged

---

## 23. Performance Acceptance

Targets from system requirements:
- public P75 LCP ≤ 2.5s under target conditions
- normal API P95 ≤ 500ms
- repair search/assignment P95 ≤ 1s
- admin report typical response ≤ 3s
- availability target 99.9%

Performance tests must use realistic data volume, indexes and production-like environment.

---

## 24. End-to-End Golden Paths

### E2E-01 Customer Repair Success
Login → search/select service/location → submit request → provider assigned/accepts → inspection → quote → customer approves → repair starts → progress → complete → customer confirms → review/warranty.

### E2E-02 Quote Rejection/Requote
Request → inspection → quote → reject → provider creates new version → customer approves new version → repair.

### E2E-03 Waiting for Parts
Approved repair → start → waiting for parts → resume → complete.

### E2E-04 Complaint
Completed/active job → complaint → admin review → information request → resolution → notifications/audit.

### E2E-05 Warranty Claim
Finalized repair → active warranty → valid claim → provider/admin handling → resolution.

### E2E-06 Provider Onboarding
Login → provider profile → services/areas → verification → subscription/payment → admin approval → eligible marketplace listing.

### E2E-07 Subscription Expiry & Renewal
Active provider → expiry → hidden from new work → renewal payment verified → eligibility restored.

---

## 25. Definition of Done for Coding

A feature is not done until:
1. linked use case implemented
2. UI states implemented
3. API contract satisfied
4. permission checks implemented server-side
5. state transition rules enforced
6. database constraints/migrations included
7. positive tests pass
8. failure/authorization tests pass
9. audit/notification effects pass where required
10. code review/CI pass
11. acceptance criteria demonstrated in staging

---

## 26. Final Pre-Coding Gate

- [ ] Steps 1–4 reviewed
- [ ] Step 5 functional freeze approved
- [ ] Step 6 database approved
- [ ] Step 7 API approved
- [ ] Step 8 permissions approved
- [ ] Step 9 state matrices approved
- [ ] Step 10 acceptance tests approved
- [ ] Open business decisions resolved/deferred
- [ ] MVP scope frozen

Once this gate is approved, development may begin from the documented baseline.
