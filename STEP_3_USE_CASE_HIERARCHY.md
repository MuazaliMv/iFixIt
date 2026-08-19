# iFixIt — Step 3 Use Case Hierarchy

**Document Type:** Use Case Hierarchy & Traceability Map  
**Status:** Draft for approval  
**Version:** 1.0  
**Date:** 2026-08-19

This document organizes iFixIt use cases into three levels:

1. **Level 1 — Business Use Cases**: what the business/user is trying to achieve.
2. **Level 2 — Functional Use Cases**: the major system capabilities needed to achieve the business use case.
3. **Level 3 — Detailed Scenario Use Cases**: implementation-level scenarios with actors, preconditions, main flows, alternate/error flows, permissions, business rules, data effects, notifications and final states.

The detailed Level 3 scenario definitions remain in `STEP_3_DETAILED_USE_CASES_AND_BUSINESS_RULES.md`. This file provides the hierarchy and traceability that sits above them.

---

# 1. Level 1 — Business Use Cases

## L1-BUC-001 — Customer Finds a Repair Provider

**Business Goal:** Allow a customer to find a qualified, eligible repair technician/provider for an exact service in the customer's location.

**Primary Actor:** Customer / Visitor

**Outcome:** Customer identifies one or more suitable providers and may continue to a repair request.

### Level 2 Functional Use Cases
- L2-SEA-001 Select location
- L2-SEA-002 Select exact repair service
- L2-SEA-003 Search local providers
- L2-SEA-004 Filter/sort providers
- L2-SEA-005 View provider profile
- L2-SEA-006 Contact provider

### Level 3 Scenario Mapping
- `UC-SEA-001` Select Location
- `UC-SEA-002` Select Exact Repair Service
- `UC-SEA-003` Search Local Providers
- `UC-SEA-004` Filter Search Results
- `UC-SEA-005` View Public Provider Profile

---

## L1-BUC-002 — Customer Requests a Repair

**Business Goal:** Allow a customer to create a complete repair request with enough information for matching, diagnosis and assignment.

**Primary Actor:** Customer

**Outcome:** A unique repair request/ticket is created and enters matching or assignment.

### Level 2 Functional Use Cases
- L2-REQ-001 Start repair request
- L2-REQ-002 Enter item/problem details
- L2-REQ-003 Upload photos/evidence
- L2-REQ-004 Select location
- L2-REQ-005 Select urgency/schedule
- L2-REQ-006 Review request
- L2-REQ-007 Submit request
- L2-REQ-008 Cancel request
- L2-REQ-009 Track request

### Level 3 Scenario Mapping
- `UC-REQ-001` Start Repair Request
- `UC-REQ-002` Enter Repair Details
- `UC-REQ-003` Upload Problem Photos
- `UC-REQ-004` Review Repair Request
- `UC-REQ-005` Submit Repair Request
- `UC-REQ-006` View Repair Request
- `UC-REQ-007` Cancel Repair Request

---

## L1-BUC-003 — Provider Joins the iFixIt Marketplace

**Business Goal:** Allow a technician or service business to register, prove eligibility, define services/locations and become eligible to receive repair work.

**Primary Actor:** Technician / Provider / Business Provider

**Outcome:** Provider becomes marketplace eligible only after required verification, approval, subscription and account conditions are met.

### Level 2 Functional Use Cases
- L2-PRV-001 Register/login
- L2-PRV-002 Select provider type
- L2-PRV-003 Complete provider profile
- L2-PRV-004 Upload verification documents
- L2-PRV-005 Select exact services
- L2-PRV-006 Select service areas
- L2-PRV-007 Configure pricing
- L2-PRV-008 Set availability
- L2-PRV-009 Select subscription
- L2-PRV-010 Pay subscription
- L2-PRV-011 Submit application
- L2-PRV-012 Respond to information request

### Level 3 Scenario Mapping
- `UC-PRV-001` Start Provider Registration
- `UC-PRV-002` Select Provider Type
- `UC-PRV-003` Complete Provider Profile
- `UC-PRV-004` Select Exact Services
- `UC-PRV-005` Select Service Areas
- `UC-PRV-006` Configure Pricing
- `UC-PRV-007` Set Availability
- `UC-PRV-008` Submit Provider Application
- `UC-VER-001` Submit Identity Verification
- `UC-VER-002` Submit Business Verification
- `UC-VER-003` Submit Qualification Verification
- `UC-SUB-001` View Subscription Plans
- `UC-SUB-002` Select Plan and Duration
- `UC-PAY-001` Initiate Subscription Payment

---

## L1-BUC-004 — iFixIt Verifies and Approves a Provider

**Business Goal:** Ensure only appropriately verified and approved providers can participate in the marketplace.

**Primary Actor:** Administrator

**Outcome:** Provider becomes approved, rejected, information-required or suspended according to policy.

### Level 2 Functional Use Cases
- L2-VER-001 Review identity verification
- L2-VER-002 Review business verification
- L2-VER-003 Review qualifications
- L2-VER-004 Request more information
- L2-VER-005 Approve verification
- L2-VER-006 Reject verification
- L2-ADM-001 Approve provider
- L2-ADM-002 Reject provider
- L2-ADM-003 Suspend provider
- L2-ADM-004 Reactivate provider

### Level 3 Scenario Mapping
- `UC-VER-004` Admin Approves Verification
- `UC-VER-005` Admin Requests More Information
- `UC-VER-006` Admin Rejects Verification
- `UC-ADM-PRV-001` Approve Provider
- `UC-ADM-PRV-002` Reject Provider
- `UC-ADM-PRV-003` Suspend Provider
- `UC-ADM-PRV-004` Reactivate Provider

---

## L1-BUC-005 — iFixIt Matches and Assigns a Repair

**Business Goal:** Route each customer repair request to eligible technicians/providers based on exact service, location, account state and marketplace rules.

**Primary Actors:** System Automation, Provider, Administrator, Customer

**Outcome:** An eligible provider accepts/responds and the repair moves toward an assigned job.

### Level 2 Functional Use Cases
- L2-MAT-001 Calculate provider eligibility
- L2-MAT-002 Match exact service
- L2-MAT-003 Match location
- L2-MAT-004 Rank providers
- L2-MAT-005 Distribute lead
- L2-MAT-006 Provider accepts/declines
- L2-MAT-007 Customer selects responding provider
- L2-MAT-008 Admin manually assigns
- L2-MAT-009 Admin reassigns

### Level 3 Scenario Mapping
- `UC-MAT-001` Evaluate Provider Eligibility
- `UC-MAT-002` Automatic Match Repair Request
- `UC-MAT-003` Admin Manually Assign Provider
- `UC-MAT-004` Reassign Provider
- `UC-LEAD-001` Provider Receives Repair Lead
- `UC-LEAD-002` Accept Lead / Assignment
- `UC-LEAD-003` Decline Lead
- `UC-LEAD-004` Lead Expires

---

## L1-BUC-006 — Provider Inspects and Quotes a Repair

**Business Goal:** Allow the assigned technician to inspect the problem, record a diagnosis and issue a controlled quotation for customer approval.

**Primary Actors:** Provider, Customer

**Outcome:** Customer receives a valid current quote that can be approved or rejected.

### Level 2 Functional Use Cases
- L2-INSP-001 Schedule inspection
- L2-INSP-002 Start inspection
- L2-INSP-003 Record diagnosis
- L2-INSP-004 Complete inspection
- L2-QUO-001 Create draft quote
- L2-QUO-002 Add labour
- L2-QUO-003 Add parts
- L2-QUO-004 Submit quote
- L2-QUO-005 View quote
- L2-QUO-006 Approve quote
- L2-QUO-007 Reject quote
- L2-QUO-008 Revise quote

### Level 3 Scenario Mapping
- `UC-INSP-001` Schedule Inspection
- `UC-INSP-002` Start Inspection
- `UC-INSP-003` Record Diagnosis
- `UC-INSP-004` Complete Inspection
- `UC-QUO-001` Create Draft Quotation
- `UC-QUO-002` Submit Quotation
- `UC-QUO-003` Customer Views Quotation
- `UC-QUO-004` Customer Approves Quotation
- `UC-QUO-005` Customer Rejects Quotation
- `UC-QUO-006` Revise Quotation

---

## L1-BUC-007 — Provider Completes a Repair

**Business Goal:** Manage the repair from accepted/approved work through progress, parts, labour, completion and customer confirmation.

**Primary Actors:** Provider, Customer, Administrator

**Outcome:** Repair is finalized, disputed or otherwise closed with complete historical records.

### Level 2 Functional Use Cases
- L2-JOB-001 Create job
- L2-JOB-002 Start repair
- L2-JOB-003 Record progress
- L2-JOB-004 Record parts
- L2-JOB-005 Record labour
- L2-JOB-006 Mark waiting for parts
- L2-JOB-007 Resume repair
- L2-JOB-008 Mark repair complete
- L2-JOB-009 Customer confirms completion
- L2-JOB-010 Customer disputes completion
- L2-JOB-011 Cancel job
- L2-JOB-012 Admin corrects/resolves job state

### Level 3 Scenario Mapping
- `UC-JOB-001` Create Repair Job
- `UC-JOB-002` Start Repair
- `UC-JOB-003` Record Repair Progress
- `UC-JOB-004` Mark Waiting for Parts
- `UC-JOB-005` Resume Repair
- `UC-JOB-006` Record Parts Used
- `UC-JOB-007` Record Labour
- `UC-JOB-008` Mark Repair Complete
- `UC-JOB-009` Customer Confirms Completion
- `UC-JOB-010` Customer Disputes Completion
- `UC-JOB-011` Cancel Job
- `UC-JOB-012` Subscription Expires During Active Job
- `UC-JOB-013` Provider Suspended During Active Job

---

## L1-BUC-008 — Customer Receives Warranty and After-Service Support

**Business Goal:** Allow the customer to receive warranty coverage, submit eligible warranty claims, review the provider and raise complaints when needed.

**Primary Actors:** Customer, Provider, Administrator

**Outcome:** Warranty, review and complaint records are handled independently but remain linked to the completed repair.

### Level 2 Functional Use Cases
- L2-WAR-001 Create warranty
- L2-WAR-002 View warranty
- L2-WAR-003 Submit warranty claim
- L2-WAR-004 Resolve warranty claim
- L2-REV-001 Determine review eligibility
- L2-REV-002 Submit review
- L2-REV-003 Edit review
- L2-REV-004 Moderate review
- L2-CMP-001 Submit complaint
- L2-CMP-002 Review complaint
- L2-CMP-003 Request information
- L2-CMP-004 Resolve/reject complaint

### Level 3 Scenario Mapping
- `UC-WAR-001` Create Repair Warranty
- `UC-WAR-002` View Warranty
- `UC-WAR-003` Submit Warranty Claim
- `UC-WAR-004` Resolve Warranty Claim
- `UC-REV-001` Determine Review Eligibility
- `UC-REV-002` Submit Verified Review
- `UC-REV-003` Edit Review
- `UC-REV-004` Moderate Review
- `UC-CMP-001` Customer Submits Complaint
- `UC-CMP-002` Provider Submits Complaint
- `UC-CMP-003` Admin Reviews Complaint
- `UC-CMP-004` Request Customer Information
- `UC-CMP-005` Request Provider Information
- `UC-CMP-006` Resolve Complaint
- `UC-CMP-007` Reject Complaint

---

## L1-BUC-009 — Provider Maintains Marketplace Subscription

**Business Goal:** Allow providers to purchase and renew marketplace entitlement while ensuring payment integrity and historical accuracy.

**Primary Actors:** Provider, Payment Gateway, System Automation, Administrator

**Outcome:** Subscription entitlement is active, expired, suspended, renewed or adjusted according to authoritative payment/subscription rules.

### Level 2 Functional Use Cases
- L2-SUB-001 View plans
- L2-SUB-002 Select plan/duration
- L2-PAY-001 Initiate payment
- L2-PAY-002 Handle browser return
- L2-PAY-003 Process signed webhook
- L2-PAY-004 Activate subscription
- L2-SUB-003 Renewal due
- L2-SUB-004 Grace period
- L2-SUB-005 Expire subscription
- L2-SUB-006 Renew subscription
- L2-SUB-007 Admin extension/correction
- L2-PAY-005 Reconcile uncertain payment
- L2-PAY-006 Refund/reversal

### Level 3 Scenario Mapping
- `UC-SUB-001` View Subscription Plans
- `UC-SUB-002` Select Plan and Duration
- `UC-SUB-003` Activate Subscription From Verified Payment
- `UC-SUB-004` Renewal Due
- `UC-SUB-005` Grace Period
- `UC-SUB-006` Expire Subscription
- `UC-SUB-007` Renew Expired Subscription
- `UC-SUB-008` Admin Extends Subscription
- `UC-PAY-001` Initiate Subscription Payment
- `UC-PAY-002` Handle Browser Return
- `UC-PAY-003` Process Payment Webhook
- `UC-PAY-004` Reconcile Uncertain Payment
- `UC-PAY-005` Process Refund/Reversal

---

## L1-BUC-010 — Administrator Operates and Governs iFixIt

**Business Goal:** Give authorized administrators controlled tools to run the marketplace, manage master data, monitor operations and preserve auditability.

**Primary Actor:** Administrator

**Outcome:** Platform operations are controlled through granular permissions and audited actions.

### Level 2 Functional Use Cases
- L2-ADM-001 Admin login/MFA
- L2-ADM-002 View dashboard
- L2-ADM-003 Manage providers
- L2-ADM-004 Manage customers
- L2-ADM-005 Manage repair requests/jobs
- L2-ADM-006 Manage service catalogue
- L2-ADM-007 Manage locations
- L2-ADM-008 Manage subscriptions/plans
- L2-ADM-009 Manage payments
- L2-ADM-010 Manage reviews
- L2-ADM-011 Manage complaints/warranty claims
- L2-ADM-012 View reports
- L2-ADM-013 View audit logs
- L2-ADM-014 Manage configuration

### Level 3 Scenario Mapping
- `UC-ADM-001` Admin Login With MFA
- `UC-ADM-002` View Admin Dashboard
- `UC-ADM-003` View Repair Request Detail
- `UC-ADM-004` Correct Job State
- `UC-ADM-005` Manage Subscription Plan
- `UC-ADM-006` Manage Feature / System Configuration
- `UC-SRV-001` Create Service Category
- `UC-SRV-002` Create Subcategory
- `UC-SRV-003` Create Exact Repair Service
- `UC-SRV-004` Disable / Archive Service
- `UC-LOC-001` Create Location
- `UC-LOC-002` Enable Marketplace Location
- `UC-LOC-003` Disable / Archive Location
- `UC-RPT-001` through `UC-RPT-005`
- `UC-AUD-001` Record Critical Admin Action
- `UC-AUD-002` View Audit Log

---

# 2. Level 2 — Functional Use Case Catalogue

The Level 2 layer is the bridge between business objectives and implementation scenarios. These are the functions developers should identify in screens, APIs, domain services and permissions.

## Authentication & Accounts
- `L2-AUTH-001` Request OTP
- `L2-AUTH-002` Verify OTP
- `L2-AUTH-003` Restore session
- `L2-AUTH-004` Logout
- `L2-AUTH-005` Change verified phone
- `L2-CUS-001` Create customer profile
- `L2-CUS-002` Update customer profile
- `L2-CUS-003` Manage notification preferences

## Discovery
- `L2-SEA-001` Select location
- `L2-SEA-002` Select exact service
- `L2-SEA-003` Search providers
- `L2-SEA-004` Filter/sort providers
- `L2-SEA-005` View public provider profile
- `L2-SEA-006` Contact provider

## Repair Request
- `L2-REQ-001` Start repair request
- `L2-REQ-002` Enter repair details
- `L2-REQ-003` Upload evidence
- `L2-REQ-004` Select urgency/schedule
- `L2-REQ-005` Review request
- `L2-REQ-006` Submit request
- `L2-REQ-007` View/track request
- `L2-REQ-008` Cancel request

## Provider Onboarding
- `L2-PRV-001` Start registration
- `L2-PRV-002` Select provider type
- `L2-PRV-003` Complete provider profile
- `L2-PRV-004` Select exact services
- `L2-PRV-005` Select service areas
- `L2-PRV-006` Configure pricing
- `L2-PRV-007` Set availability
- `L2-PRV-008` Submit application

## Verification & Approval
- `L2-VER-001` Submit identity verification
- `L2-VER-002` Submit business verification
- `L2-VER-003` Submit qualification verification
- `L2-VER-004` Review verification
- `L2-VER-005` Request more information
- `L2-VER-006` Approve/reject verification
- `L2-ADM-PRV-001` Approve/reject provider
- `L2-ADM-PRV-002` Suspend/reactivate provider

## Matching & Leads
- `L2-MAT-001` Evaluate eligibility
- `L2-MAT-002` Auto-match request
- `L2-MAT-003` Manual assignment
- `L2-MAT-004` Reassignment
- `L2-LEAD-001` Deliver lead
- `L2-LEAD-002` View lead
- `L2-LEAD-003` Accept lead
- `L2-LEAD-004` Decline lead
- `L2-LEAD-005` Expire/close lead

## Inspection & Diagnosis
- `L2-INSP-001` Schedule inspection
- `L2-INSP-002` Start inspection
- `L2-INSP-003` Record diagnosis
- `L2-INSP-004` Add inspection evidence
- `L2-INSP-005` Complete inspection

## Quotation
- `L2-QUO-001` Create quote
- `L2-QUO-002` Add parts/labour lines
- `L2-QUO-003` Calculate total
- `L2-QUO-004` Submit quote
- `L2-QUO-005` View quote
- `L2-QUO-006` Approve quote
- `L2-QUO-007` Reject quote
- `L2-QUO-008` Revise/version quote

## Repair Job
- `L2-JOB-001` Create job
- `L2-JOB-002` Schedule/start repair
- `L2-JOB-003` Record progress
- `L2-JOB-004` Record parts
- `L2-JOB-005` Record labour
- `L2-JOB-006` Set waiting/on-hold
- `L2-JOB-007` Resume repair
- `L2-JOB-008` Mark repair complete
- `L2-JOB-009` Confirm completion
- `L2-JOB-010` Dispute completion
- `L2-JOB-011` Cancel job

## Warranty / Review / Complaint
- `L2-WAR-001` Create warranty
- `L2-WAR-002` View warranty
- `L2-WAR-003` Submit claim
- `L2-WAR-004` Resolve claim
- `L2-REV-001` Determine review eligibility
- `L2-REV-002` Submit review
- `L2-REV-003` Edit review
- `L2-REV-004` Moderate review
- `L2-CMP-001` Submit complaint
- `L2-CMP-002` Review complaint
- `L2-CMP-003` Request information
- `L2-CMP-004` Resolve/reject complaint

## Subscription / Payment
- `L2-SUB-001` View plans
- `L2-SUB-002` Select plan/duration
- `L2-SUB-003` Activate entitlement
- `L2-SUB-004` Renewal due/grace
- `L2-SUB-005` Expire
- `L2-SUB-006` Renew
- `L2-SUB-007` Admin adjustment
- `L2-PAY-001` Initiate payment
- `L2-PAY-002` Handle return
- `L2-PAY-003` Verify webhook
- `L2-PAY-004` Process payment result
- `L2-PAY-005` Reconcile
- `L2-PAY-006` Refund/reversal

## Admin / Reporting / Audit
- `L2-ADM-001` Admin login/MFA
- `L2-ADM-002` Dashboard
- `L2-ADM-003` Provider management
- `L2-ADM-004` Repair operations
- `L2-SRV-001` Service master management
- `L2-LOC-001` Location management
- `L2-ADM-005` Subscription/plan management
- `L2-ADM-006` Payment operations
- `L2-ADM-007` Review moderation
- `L2-ADM-008` Complaint/warranty oversight
- `L2-RPT-001` Operational reports
- `L2-RPT-002` Provider performance
- `L2-RPT-003` Revenue/subscription reports
- `L2-RPT-004` Supply/demand reports
- `L2-AUD-001` Record audit event
- `L2-AUD-002` View/filter audit log
- `L2-CFG-001` Manage configuration/feature flags

---

# 3. Level 3 — Detailed Scenario Use Cases

Level 3 is the implementation-ready layer. Each Level 3 scenario should define, where applicable:

- Use Case ID
- Name
- Level 1 parent
- Level 2 parent
- Primary actor
- Supporting actors/systems
- Goal
- Preconditions
- Trigger
- Main success flow
- Alternate flows
- Failure/exception flows
- Permission/ownership rules
- Business rules
- Validation
- Data created
- Data updated
- State transitions
- Notifications/events
- Audit requirement
- Postconditions/final state
- Related UI screen(s)
- Related API endpoint(s)
- Related database entities
- Related test cases

The current full Level 3 scenario definitions are maintained in:

`STEP_3_DETAILED_USE_CASES_AND_BUSINESS_RULES.md`

### Example traceability

`L1-BUC-002 Customer Requests a Repair`
→ `L2-REQ-006 Submit Request`
→ `UC-REQ-005 Submit Repair Request`
→ Customer Request UI
→ Request API
→ `repair_requests`, `request_attachments`, `request_status_history`
→ request ownership/idempotency rules
→ Step 8 test cases

---

# 4. Business-Process Traceability

## Customer Gets a Repair Completed

```text
L1-BUC-001 Find Provider
        ↓
L1-BUC-002 Request Repair
        ↓
L1-BUC-005 Match / Assign Provider
        ↓
L1-BUC-006 Inspect & Quote
        ↓
L1-BUC-007 Perform Repair
        ↓
L1-BUC-008 Warranty / Review / Support
```

## Provider Becomes Eligible and Receives Work

```text
L1-BUC-003 Provider Joins
        ↓
L1-BUC-004 Verification / Approval
        ↓
L1-BUC-009 Subscription Active
        ↓
Marketplace Eligibility
        ↓
L1-BUC-005 Matching / Assignment
        ↓
L1-BUC-006 Inspection / Quote
        ↓
L1-BUC-007 Repair Completion
```

## Admin Governance

```text
L1-BUC-010 Operate Platform
        ├── Provider verification/approval
        ├── Service/location master data
        ├── Repair intervention
        ├── Subscription/payment operations
        ├── Complaint/warranty oversight
        ├── Reporting
        └── Audit
```

---

# 5. Global Business Rules Across All Levels

1. **Server authority:** UI never bypasses server-side rules.
2. **Historical preservation:** operational history is retained; ordinary workflows do not destructively erase jobs, requests, payments, reviews, complaints or audit history.
3. **Ownership:** users may access only resources they own/are assigned to unless a public/admin permission explicitly allows otherwise.
4. **Provider eligibility:** approval, active account, required verification, qualifying subscription and non-suspension are independently enforced.
5. **Exact skill:** provider must explicitly support the requested exact service.
6. **Location:** provider must explicitly serve the request location.
7. **Suspension priority:** suspension overrides subscription, availability, rating and featured placement.
8. **Idempotency:** request submission, payment processing, assignment/job creation and other non-repeatable operations must be safe under retries.
9. **Concurrency:** competing state changes must resolve deterministically and atomically.
10. **Payment integrity:** browser return is not proof of payment; authoritative signed gateway evidence is required.
11. **Quote versioning:** customer approval applies to one exact quote version.
12. **Active-job continuity:** subscription expiry does not destroy or hide an existing assigned repair.
13. **Complaint independence:** a complaint is not automatic proof of fault or automatic suspension.
14. **Review uniqueness:** one verified review per eligible repair job unless an explicit revision mechanism is used.
15. **Notification isolation:** non-critical notification failure does not roll back the business transaction.
16. **Auditability:** high-risk admin decisions record actor, action, target, state change, reason, timestamp and correlation context.

---

# 6. Hierarchy Approval Checklist

## Level 1
- [ ] Customer discovery business use case approved
- [ ] Repair-request business use case approved
- [ ] Provider onboarding business use case approved
- [ ] Provider verification/approval business use case approved
- [ ] Matching/assignment business use case approved
- [ ] Inspection/quotation business use case approved
- [ ] Repair execution business use case approved
- [ ] Warranty/review/complaint business use case approved
- [ ] Subscription business use case approved
- [ ] Admin governance business use case approved

## Level 2
- [ ] Authentication/account functions approved
- [ ] Discovery functions approved
- [ ] Request functions approved
- [ ] Provider onboarding functions approved
- [ ] Verification functions approved
- [ ] Matching/lead functions approved
- [ ] Inspection functions approved
- [ ] Quotation functions approved
- [ ] Job functions approved
- [ ] Warranty/review/complaint functions approved
- [ ] Subscription/payment functions approved
- [ ] Admin/reporting/audit functions approved

## Level 3
- [ ] Each detailed scenario has a Level 1 parent
- [ ] Each detailed scenario has a Level 2 parent
- [ ] Preconditions defined
- [ ] Main flow defined
- [ ] Alternate flow defined where relevant
- [ ] Failure flow defined where relevant
- [ ] Permissions/ownership defined
- [ ] Business rules defined
- [ ] Data effects defined
- [ ] State transitions defined
- [ ] Notifications defined
- [ ] Audit requirements defined where relevant
- [ ] Related UI/API/database/test references added during later design steps

---

# 7. Development Rule

Developers should trace every implementation item through the hierarchy:

```text
Business Goal (Level 1)
        ↓
System Function (Level 2)
        ↓
Detailed Scenario (Level 3)
        ↓
UI Screen
        ↓
API Contract
        ↓
Database Entities / Constraints
        ↓
Permissions
        ↓
State Machine
        ↓
Test Cases
```

If a feature cannot be traced through this chain, it should not be implemented until its requirement is clarified and documented.
