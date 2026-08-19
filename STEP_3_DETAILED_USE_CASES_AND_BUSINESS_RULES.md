# iFixIt — Step 3: Detailed Use Cases & Business Rules

**Document Type:** Functional Source of Truth  
**Status:** Draft for approval before database/API implementation  
**Version:** 1.0  
**Date:** 2026-08-19

---

## 1. Purpose

This document defines the detailed functional behavior of iFixIt before database, API, permission, and production code are finalized.

Every use case contains, where applicable:

- Use Case ID
- Actor
- Goal
- Preconditions
- Trigger
- Main Flow
- Alternate Flow
- Failure / Exception Flow
- Permissions
- Business Rules
- Data Created / Updated
- Notifications
- Final State

The intent is to eliminate business ambiguity during development.

---

# 2. Actors

## ACT-01 — Visitor
Can browse public services and provider profiles, but cannot create protected repair requests until authenticated.

## ACT-02 — Customer
Can create and manage their own repair requests, quotations, jobs, reviews, complaints, and warranty claims.

## ACT-03 — Technician / Provider
Can manage provider profile, services, service areas, availability, assignments, inspections, quotations, repairs, parts, labour, and completion.

## ACT-04 — Business Provider
Same core rights as technician/provider, with future ability to manage staff and assign work internally.

## ACT-05 — Administrator
Can manage marketplace master data, technicians, requests, jobs, quotations, complaints, warranties, subscriptions, payments, reports, and audit history subject to granular permissions.

## ACT-06 — System Automation
Handles matching, expiry, notifications, reminders, auto-finalization, background reconciliation, and state recalculation.

## ACT-07 — Payment Gateway
External system providing payment state and signed callbacks/webhooks.

## ACT-08 — OTP / Messaging Provider
External provider used for authentication and selected notifications.

---

# 3. Global Business Rules

## BR-GEN-001 — Server Is Authoritative
The frontend may display states and possible actions, but all protected business rules must be validated server-side.

## BR-GEN-002 — Historical Records Are Preserved
Requests, jobs, quotations, payments, complaints, reviews, warranties, and audit events must not be destructively deleted through ordinary business flows.

## BR-GEN-003 — Status History
Important entities must preserve state-transition history rather than overwriting the only record of prior states.

## BR-GEN-004 — Role and Ownership Checks
A valid login alone never grants access. Resource ownership, role, permission, and entity state must all be validated.

## BR-GEN-005 — Idempotency
Critical non-repeatable actions such as request submission, payment processing, assignment, job creation, and review submission must be safe under retries.

## BR-GEN-006 — Concurrency
Where two actions can race, the system must use transactional or optimistic-locking rules so the final state is deterministic.

## BR-GEN-007 — Soft Disable / Archive
Master data such as services, locations, plans, and provider profiles should normally be disabled or archived rather than hard-deleted when referenced historically.

## BR-GEN-008 — Notifications Are Secondary
Failure to send a non-critical notification must not roll back a valid repair, payment, job, or complaint transaction.

---

# 4. Authentication & Account Use Cases

## UC-AUTH-001 — Request OTP

**Actor:** Visitor / unauthenticated user  
**Goal:** Receive a one-time code to authenticate.

**Preconditions:**
- Supported mobile number.
- User not rate-limited.

**Trigger:** User enters phone number and presses Continue.

**Main Flow:**
1. System normalizes the phone number.
2. System validates supported format.
3. System applies OTP request rate limits.
4. System creates an OTP challenge.
5. OTP provider sends the code.
6. System displays verification screen with masked phone number.

**Alternate Flow:**
- Existing account: authentication continues to existing profile.
- New account: permitted account is created only after successful verification.

**Failure Flow:**
- Invalid number.
- Unsupported number.
- Too many attempts.
- OTP provider unavailable.

**Permissions:** Public.

**Business Rules:**
- OTP must not be logged in plain text.
- Challenge expiry must be enforced.
- Repeated requests must be throttled.

**Data:** OTP challenge / auth event.

**Notifications:** OTP message.

**Final State:** OTP challenge active.

---

## UC-AUTH-002 — Verify OTP

**Actor:** User with active challenge  
**Goal:** Authenticate securely.

**Main Flow:**
1. User enters OTP.
2. System validates challenge, code, expiry, attempt count, and phone.
3. Existing user account is loaded or new account is initialized.
4. Session is created.
5. User is routed to intended area.

**Failure Flow:**
- Wrong code.
- Expired code.
- Attempt limit exceeded.
- Challenge already consumed.

**Business Rules:**
- Successful challenge cannot be reused.
- Session must be tied to authoritative user identity.

**Final State:** Authenticated session.

---

## UC-AUTH-003 — Log Out

**Actor:** Authenticated user  
**Goal:** End current session.

**Main Flow:**
1. User selects Logout.
2. System invalidates/revokes session according to auth architecture.
3. Protected context is cleared.
4. User returns to public state.

**Final State:** Unauthenticated.

---

## UC-AUTH-004 — Change Verified Phone Number

**Actor:** Authenticated customer/provider  
**Goal:** Replace verified phone safely.

**Preconditions:** Current account active.

**Main Flow:**
1. User requests phone change.
2. System requires re-authentication or new OTP verification.
3. New number is normalized and checked for uniqueness.
4. New phone is verified.
5. Account phone is updated.
6. Security event is recorded.

**Failure Flow:**
- New number already used.
- OTP fails.
- Session no longer trusted.

**Business Rules:** Direct overwrite of verified phone is not allowed.

---

# 5. Customer Profile Use Cases

## UC-CUS-001 — Create / Complete Customer Profile

**Actor:** Customer  
**Goal:** Store basic customer information needed for repairs.

**Fields:**
- Full name
- Phone (verified)
- Email optional
- Default location optional
- Notification preferences

**Main Flow:**
1. Customer enters profile data.
2. System validates fields.
3. Profile is saved.

**Failure Flow:** Invalid email, invalid field lengths, unauthorized field changes.

**Final State:** Customer profile active.

---

## UC-CUS-002 — Update Customer Profile

**Actor:** Customer self  
**Goal:** Change allowed profile data.

**Business Rules:**
- Protected fields use dedicated verification flows.
- User cannot modify another customer profile.

---

# 6. Public Discovery & Provider Search Use Cases

## UC-SEA-001 — Select Location

**Actor:** Visitor / Customer  
**Goal:** Define where repair service is needed.

**Main Flow:**
1. User opens location selector.
2. System shows active marketplace-enabled Maldives locations.
3. User selects island/city/locality.
4. Selection is stored for current flow.

**Failure Flow:** Disabled or unsupported location.

**Business Rule:** Disabled locations cannot be used for new requests or search.

---

## UC-SEA-002 — Select Exact Repair Service

**Actor:** Visitor / Customer  
**Goal:** Identify the exact required service.

**Main Flow:**
1. User browses Category → Subcategory → Specific Service.
2. System displays active services only.
3. User selects exact service.

**Business Rule:** Selecting a broad category alone does not imply every repair skill.

---

## UC-SEA-003 — Search Local Providers

**Actor:** Visitor / Customer  
**Goal:** Find eligible technicians/providers for exact service and location.

**Preconditions:**
- Active location selected.
- Active exact service selected.

**Main Flow:**
1. Search request is submitted.
2. System evaluates provider marketplace eligibility.
3. System filters exact service capability.
4. System filters provider service area.
5. Optional filters are applied.
6. Eligible providers are ranked.
7. Results are returned.

**Provider Base Eligibility:**
- Provider approved.
- Provider account active.
- Required verification satisfied.
- Qualifying subscription active/grace as configured.
- Provider not suspended.

**Search Eligibility Adds:**
- Exact service match.
- Location match.

**Failure / Empty Flow:**
- No providers -> safe no-match state.
- Search infrastructure failure -> retry state.

**Business Rules:**
- Sponsored/featured status never overrides eligibility.
- Availability never overrides suspension or expired entitlement.

**Final State:** Search results displayed.

---

## UC-SEA-004 — Filter Search Results

**Filters:**
- Availability
- Verification
- Rating
- Provider type
- Pricing type
- Price range
- Experience

**Business Rule:** Filter/sort never reintroduces an ineligible provider.

---

## UC-SEA-005 — View Public Provider Profile

**Actor:** Public user  
**Goal:** Evaluate a provider before creating repair request.

**Main Flow:**
1. User opens provider.
2. System validates public eligibility/visibility.
3. Public profile is displayed.

**Public Data May Include:**
- Public name/business
- Photo/logo
- Description
- Services
- Service areas
- Pricing
- Availability
- Verification badges
- Rating/reviews
- Gallery
- Approved public contact actions

**Must Never Include:**
- Identity files
- Internal admin notes
- Private complaints
- Private payment details
- Non-public phone
- Security metadata

---

# 7. Repair Request Use Cases

## UC-REQ-001 — Start Repair Request

**Actor:** Authenticated Customer  
**Goal:** Begin a repair ticket.

**Preconditions:** Customer active.

**Main Flow:**
1. Customer selects Request Repair.
2. System opens structured request flow.
3. Draft context is initialized.

---

## UC-REQ-002 — Enter Repair Details

**Actor:** Customer

**Required / Conditional Fields:**
- Exact repair service
- Item/equipment type
- Brand optional/conditional
- Model optional/conditional
- Serial number optional
- Problem description
- Location
- Address/access notes
- Urgency
- Preferred date/time where needed
- Photos optional/required by policy
- Video optional if enabled

**Business Rules:**
- Description must meet min/max length.
- Disabled service/location rejected server-side.
- Past dates rejected where scheduling is future-only.

---

## UC-REQ-003 — Upload Problem Photos

**Actor:** Customer  
**Goal:** Attach visual evidence.

**Main Flow:**
1. Customer selects photo.
2. System validates file type/size/count.
3. File uploads to controlled storage.
4. Attachment metadata links to draft/request.

**Failure Flow:** Upload fails -> form remains intact and retry is available.

**Business Rules:**
- No executable content.
- MIME/type validation.
- File ownership enforced.

---

## UC-REQ-004 — Review Repair Request

**Actor:** Customer  
**Goal:** Confirm information before submission.

**Main Flow:**
1. System displays service, item, description, location, urgency, schedule, files.
2. Customer can return to edit.
3. Customer confirms submission.

---

## UC-REQ-005 — Submit Repair Request

**Actor:** Customer

**Main Flow:**
1. Customer presses Submit.
2. Server revalidates all mandatory data.
3. System generates unique ticket ID, e.g. `IFX-2026-001245`.
4. Repair request is committed.
5. Initial status becomes `SUBMITTED`.
6. Status-history entry is created.
7. Matching/assignment process begins.
8. Customer sees confirmation.

**Failure Flow:**
- Invalid stale service/location.
- Session expired.
- Database transaction failure.
- Duplicate retry.

**Business Rules:**
- Double click/network retry must not create duplicate logical request.
- System must not show success until request transaction is committed.

**Data:**
- repair_requests
- request_attachments
- request_status_history

**Notification:** Request submitted confirmation.

**Final State:** `SUBMITTED`.

---

## UC-REQ-006 — View Repair Request

**Actor:** Request owner / authorized admin / assigned provider where permitted.

**Business Rule:** Customer cannot access another customer's private request by changing ID.

---

## UC-REQ-007 — Cancel Repair Request

**Actor:** Customer / authorized admin depending state  
**Goal:** Cancel request before prohibited lifecycle boundary.

**Main Flow:**
1. User selects Cancel.
2. System verifies ownership and current state.
3. Confirmation shown.
4. Request becomes `CANCELLED`.
5. Outstanding leads/assignments are closed as applicable.
6. History entry created.
7. Affected parties notified.

**Failure Flow:** Already completed/finalized/otherwise non-cancellable.

**Business Rule:** Cancellation never deletes history.

---

# 8. Provider Onboarding Use Cases

## UC-PRV-001 — Start Provider Registration

**Actor:** Authenticated user  
**Goal:** Apply to provide repair services.

**Main Flow:** Provider onboarding profile initialized.

---

## UC-PRV-002 — Select Provider Type

**Values:**
- Individual Technician
- Business Provider

**Business Rule:** Exactly one type required.

---

## UC-PRV-003 — Complete Provider Profile

**Fields May Include:**
- Public name
- Business name if applicable
- Representative
- Photo/logo
- Description
- Years of experience
- Public phone preference
- WhatsApp preference

**Business Rules:**
- Provider cannot edit admin approval, rating aggregate, or suspension state.

---

## UC-PRV-004 — Select Exact Services

**Actor:** Provider applicant / approved provider

**Main Flow:**
1. Provider browses active catalogue.
2. Selects exact repair services.
3. System prevents duplicate provider-service mappings.
4. Required qualification prompts appear where configured.

**Business Rules:**
- Disabled service cannot be newly selected.
- Removing a service stops future matching only; history remains.

---

## UC-PRV-005 — Select Service Areas

**Actor:** Provider

**Main Flow:** Provider selects locations served.

**Business Rules:**
- Duplicate provider/location relation prohibited.
- Removing service area affects future matching only.

---

## UC-PRV-006 — Configure Pricing

**Pricing Types:**
- Fixed
- Starting From
- Hourly
- Inspection Required
- Quote Required

**Rules:**
- Amount >= 0.
- Numeric amount required for Fixed/Starting From/Hourly.
- Quote Required / Inspection Required may omit amount.
- Default currency MVR for MVP.

---

## UC-PRV-007 — Set Availability

**Statuses:**
- Available Now
- Available Today
- By Appointment
- Unavailable

**Additional Setting:** Accepting Leads On/Off.

**Business Rule:** Availability does not override approval, subscription, verification, or suspension.

---

## UC-PRV-008 — Submit Provider Application

**Preconditions:**
- Required profile complete.
- Required verification submitted.
- At least one exact service.
- At least one service area.
- Subscription/payment prerequisites satisfied according to policy.

**Main Flow:**
1. Provider reviews summary.
2. Accepts provider terms.
3. Submits application.
4. Application enters review state.
5. Admin queue updated.

**Final State:** `PENDING_VERIFICATION` or `PENDING_APPROVAL` depending process.

---

# 9. Provider Verification Use Cases

## UC-VER-001 — Submit Identity Verification

**Actor:** Individual Provider

**Main Flow:**
1. Select document type.
2. Upload private document.
3. Metadata recorded.
4. Verification state becomes `SUBMITTED`.

**Business Rule:** Verification files remain private.

---

## UC-VER-002 — Submit Business Verification

**Actor:** Business Provider

**Data:** Registration number, registration document, representative information.

---

## UC-VER-003 — Submit Qualification Verification

**Actor:** Provider

**Fields:** Certificate name, issuer, issue date, expiry date, attachment.

---

## UC-VER-004 — Admin Approves Verification

**Actor:** Authorized Admin

**Main Flow:**
1. Admin opens verification.
2. Secure document access validated.
3. Admin reviews evidence.
4. Approves verification.
5. Status becomes `VERIFIED`.
6. Review timestamp/admin recorded.
7. Audit event created.
8. Eligibility recalculated where relevant.

---

## UC-VER-005 — Admin Requests More Information

**Main Flow:**
1. Admin enters reason/request.
2. Verification becomes `INFORMATION_REQUIRED`.
3. Provider notified.
4. Provider may replace/add evidence.
5. Resubmission returns to review.

---

## UC-VER-006 — Admin Rejects Verification

**Business Rules:**
- Rejection reason mandatory.
- Provider cannot self-change to verified.
- Rejected evidence remains historically traceable according to retention policy.

---

# 10. Provider Approval & Suspension Use Cases

## UC-ADM-PRV-001 — Approve Provider

**Actor:** Admin with `provider.approve`

**Preconditions:** Required verification complete.

**Main Flow:**
1. Admin reviews provider summary.
2. System checks required prerequisites.
3. Admin confirms approval.
4. Provider state becomes `APPROVED`.
5. Eligibility recalculated.
6. Audit event recorded.
7. Provider notified.

**Business Rule:** Approval alone does not bypass subscription requirements.

---

## UC-ADM-PRV-002 — Reject Provider

**Actor:** Authorized Admin

**Rules:** Reason mandatory; history retained.

---

## UC-ADM-PRV-003 — Suspend Provider

**Actor:** Admin with `provider.suspend`

**Main Flow:**
1. Admin selects Suspend.
2. System requires confirmation and reason.
3. Provider becomes `SUSPENDED`.
4. Marketplace eligibility immediately becomes false.
5. New leads/search visibility disabled.
6. Existing jobs/history preserved.
7. Audit event recorded.
8. Provider notified where policy allows.

**Business Rule:** Suspension overrides subscription and availability.

---

## UC-ADM-PRV-004 — Reactivate Provider

**Actor:** Authorized Admin

**Main Flow:**
1. Suspension is resolved.
2. Admin selects Reactivate.
3. Provider returns to approved state if valid.
4. Eligibility is recalculated from all other requirements.

**Business Rule:** Reactivation does not bypass expired subscription or failed verification.

---

# 11. Matching & Assignment Use Cases

## UC-MAT-001 — Evaluate Provider Eligibility

**System Rule:**

`MarketplaceEligible = Approved AND AccountActive AND RequiredVerificationValid AND QualifyingSubscription AND NOT Suspended`

`RepairEligible = MarketplaceEligible AND ExactServiceMatch AND LocationMatch AND AcceptingLeads`

**Business Rule Priority:**
1. Suspension/safety restriction
2. Account status
3. Verification
4. Subscription
5. Exact service
6. Location
7. Accepting leads
8. Availability/ranking

---

## UC-MAT-002 — Automatic Match Repair Request

**Actor:** System

**Main Flow:**
1. Request enters matching.
2. System loads exact service/location.
3. Eligible provider set calculated.
4. Providers ranked.
5. Lead/assignment distribution follows configured model.

**Recommended Model:** Progressive ranked distribution.

**Failure Flow:** No eligible providers -> request remains open or moves to no-match/expiry path according to policy.

---

## UC-MAT-003 — Admin Manually Assign Provider

**Actor:** Authorized Admin

**Main Flow:**
1. Admin opens unassigned request.
2. System shows eligible providers.
3. Admin selects provider.
4. System revalidates eligibility.
5. Assignment created.
6. Provider notified.
7. Audit event recorded.

**Business Rule:** Admin override may select among eligible providers but should not silently bypass suspension/security restrictions.

---

## UC-MAT-004 — Reassign Provider

**Actor:** Admin

**Preconditions:** Reassignment permitted by job/request state.

**Main Flow:**
1. Admin selects Reassign.
2. Reason required.
3. Old assignment closed/replaced according to policy.
4. New provider revalidated and assigned.
5. Timeline/audit updated.
6. Customer and affected providers notified.

---

# 12. Lead / Assignment Response Use Cases

## UC-LEAD-001 — Provider Receives Repair Lead

**Actor:** Provider

**Preconditions:** Provider eligible at lead creation.

**Data Visible:** Service, location, urgency, customer-safe description, schedule, allowed attachments.

---

## UC-LEAD-002 — Accept Lead / Assignment

**Actor:** Assigned/eligible Provider

**Main Flow:**
1. Provider opens lead.
2. Selects Accept.
3. System revalidates provider eligibility and request state.
4. Lead becomes accepted.
5. Assignment/job is created or response recorded depending distribution model.
6. Customer notified.

**Concurrency Rule:** If selection is exclusive, acceptance must be atomic so incompatible multiple winners cannot occur.

---

## UC-LEAD-003 — Decline Lead

**Actor:** Provider

**Main Flow:** Provider declines; optional reason recorded; distribution continues according to model.

---

## UC-LEAD-004 — Lead Expires

**Actor:** System

**Business Rule:** Expired lead cannot later be accepted.

---

# 13. Inspection Use Cases

## UC-INSP-001 — Schedule Inspection

**Actor:** Provider / coordinated customer workflow

**Main Flow:**
1. Provider proposes/selects inspection date/time.
2. System validates allowed schedule.
3. Job status/timeline updated to inspection scheduled.
4. Customer notified.

---

## UC-INSP-002 — Start Inspection

**Actor:** Assigned Provider

**Main Flow:** Inspection state becomes in progress; timestamp recorded.

---

## UC-INSP-003 — Record Diagnosis

**Actor:** Provider

**Fields:**
- Diagnosis summary
- Fault identified
- Recommended repair
- Parts required
- Labour estimate
- Repair-time estimate
- Inspection notes
- Photos

**Business Rules:**
- Customer-visible notes and internal notes should be distinguishable if both are supported.
- History preserved.

---

## UC-INSP-004 — Complete Inspection

**Actor:** Provider

**Main Flow:**
1. Provider confirms inspection data.
2. Inspection becomes completed.
3. Job moves to quotation-required or direct-repair path according to policy.

---

# 14. Quotation Use Cases

## UC-QUO-001 — Create Draft Quotation

**Actor:** Assigned Provider

**Fields:**
- Labour line items
- Parts line items
- Quantity
- Unit price
- Additional charges
- Discount
- Tax if applicable
- Total
- Estimated completion duration
- Expiry date
- Notes

**Business Rules:**
- Monetary totals calculated server-side.
- Negative quantities/prices prohibited except explicitly modeled discounts.

---

## UC-QUO-002 — Submit Quotation

**Actor:** Provider

**Main Flow:**
1. Provider reviews quote.
2. System validates totals and job relationship.
3. Quote becomes `SUBMITTED`.
4. Customer notification sent.

**Business Rule:** Submitted quote should become versioned/controlled; silent overwrite is not allowed.

---

## UC-QUO-003 — Customer Views Quotation

**Actor:** Job Customer

**Data:** Itemized price, total, provider notes, validity, estimated repair time.

---

## UC-QUO-004 — Customer Approves Quotation

**Actor:** Job Customer

**Main Flow:**
1. Customer presses Approve.
2. System validates quote still current/not expired.
3. Quote becomes `APPROVED`.
4. Job becomes repair-ready / `QUOTE_APPROVED`.
5. Provider notified.
6. Approval timestamp recorded.

**Concurrency Rule:** Approval against replaced/expired quote is rejected.

---

## UC-QUO-005 — Customer Rejects Quotation

**Actor:** Job Customer

**Main Flow:** Quote becomes `REJECTED`; optional reason recorded; provider notified.

**Business Rule:** Rejected quote does not automatically delete job/request; next action follows policy (re-quote, cancel, close).

---

## UC-QUO-006 — Revise Quotation

**Actor:** Provider

**Preconditions:** Revision allowed by quote/job state.

**Main Flow:**
1. Provider creates new quote version.
2. Previous version preserved.
3. New version becomes current/submitted.
4. Customer re-approval required.

---

# 15. Repair Job Use Cases

## UC-JOB-001 — Create Repair Job

**Actor:** System

**Trigger:** Provider selection/accepted assignment.

**Business Rules:**
- Job linked to customer, request, provider, service, and location.
- Duplicate retry must not create duplicate logical job.

---

## UC-JOB-002 — Start Repair

**Actor:** Assigned Provider

**Preconditions:**
- Required inspection/quote approval complete according to workflow.

**Main Flow:** Job transitions to `IN_PROGRESS`; history entry created; customer notified.

---

## UC-JOB-003 — Record Repair Progress

**Actor:** Provider

**Data:** Progress note, optional photos, timestamp, customer-visible flag where supported.

**Business Rule:** Progress history should be append-oriented.

---

## UC-JOB-004 — Mark Waiting for Parts

**Actor:** Provider

**Main Flow:**
1. Provider selects Waiting for Parts.
2. Optional required part/reason recorded.
3. Job state becomes `WAITING_FOR_PARTS`.
4. Customer notified.

---

## UC-JOB-005 — Resume Repair

**Actor:** Provider

**Precondition:** Job waiting/on hold.

**Main Flow:** Job returns to `IN_PROGRESS`; timeline updated.

---

## UC-JOB-006 — Record Parts Used

**Actor:** Provider

**Fields:**
- Part name
- Part number
- Brand optional
- Quantity
- Unit price
- Supplier/reference optional
- Installed date
- Warranty duration/terms optional

**Business Rule:** Initial system records usage/cost; full inventory management is outside MVP unless separately approved.

---

## UC-JOB-007 — Record Labour

**Actor:** Provider

**Fields:** Description, hours optional, rate, amount.

---

## UC-JOB-008 — Mark Repair Complete

**Actor:** Provider

**Preconditions:** Job in valid active repair state.

**Required Completion Data:**
- Completion notes
- Final parts/labour
- Final amount context where applicable
- Final photos if required
- Warranty details if offered

**Main Flow:**
1. Provider selects Mark Complete.
2. Server validates job state.
3. Completion data saved.
4. Job state becomes `REPAIR_COMPLETED` / `CUSTOMER_CONFIRMATION`.
5. Status history created.
6. Customer notified.

---

## UC-JOB-009 — Customer Confirms Completion

**Actor:** Customer

**Main Flow:**
1. Customer views completed repair.
2. Confirms satisfactory completion.
3. Job becomes `FINALIZED`.
4. Warranty becomes active if applicable.
5. Review eligibility enabled.

---

## UC-JOB-010 — Customer Disputes Completion

**Actor:** Customer

**Main Flow:**
1. Customer selects Report Problem.
2. Enters issue details.
3. Job becomes `DISPUTED`.
4. Complaint/dispute record created or linked.
5. Admin notified.

---

## UC-JOB-011 — Cancel Job

**Actor:** Customer / Provider / Admin depending state and policy.

**Business Rules:**
- Allowed cancellation states must be explicit.
- Reason should be recorded.
- Completed/finalized jobs cannot be casually cancelled.
- Cancellation is historical, not destructive.

---

## UC-JOB-012 — Subscription Expires During Active Job

**Actor:** System

**Business Rule:** Provider loses new marketplace eligibility, but active/historical job access is preserved so the existing repair can be safely handled.

---

## UC-JOB-013 — Provider Suspended During Active Job

**Actor:** Admin/System

**Business Rule:**
- New search/leads blocked immediately.
- Job data preserved.
- Admin safety/operational policy determines whether reassignment, restricted completion, or intervention is required.

---

# 16. Warranty Use Cases

## UC-WAR-001 — Create Repair Warranty

**Actor:** System/Provider according to approved policy

**Preconditions:** Repair finalized and warranty offered.

**Fields:**
- Warranty type
- Start date
- End date/duration
- Covered repair
- Covered parts
- Terms
- Status

**Initial State:** `ACTIVE`.

---

## UC-WAR-002 — View Warranty

**Actor:** Customer / assigned Provider / Admin according to permissions.

---

## UC-WAR-003 — Submit Warranty Claim

**Actor:** Customer

**Preconditions:**
- Original job belongs to customer.
- Warranty active.
- Claim falls within allowed coverage period.

**Main Flow:**
1. Customer selects Claim Warranty.
2. Describes recurring/problem issue.
3. Uploads evidence if available.
4. Claim created.
5. Provider/admin notified.

**Failure Flow:** Warranty expired, void, unrelated job, unauthorized customer.

---

## UC-WAR-004 — Resolve Warranty Claim

**Actor:** Authorized Provider/Admin according to policy.

**Possible Outcomes:** Accepted for remedial work, rejected with reason, closed after completion.

---

# 17. Review Use Cases

## UC-REV-001 — Determine Review Eligibility

**Rule:** Customer may review only an eligible completed/finalized repair that belongs to them.

---

## UC-REV-002 — Submit Verified Review

**Actor:** Customer

**Ratings:**
- Quality
- Punctuality
- Communication
- Professionalism
- Value for money

**Main Flow:**
1. Customer rates dimensions.
2. Adds optional written feedback.
3. Server validates ownership and job eligibility.
4. Review created.
5. Provider aggregate rating recalculated.
6. Provider notified.

**Business Rule:** One verified review per eligible job.

---

## UC-REV-003 — Edit Review

**Actor:** Review owner

**Rule:** Only within configured edit window; revision history preserved.

---

## UC-REV-004 — Moderate Review

**Actor:** Admin with moderation permission

**Actions:** Keep published, hide, restore, remove according to policy.

**Rules:** Reason/audit required for moderation; provider cannot edit customer review.

---

# 18. Complaint & Dispute Use Cases

## UC-CMP-001 — Customer Submits Complaint

**Categories May Include:**
- Technician no-show
- Repair not completed
- Incorrect diagnosis
- Poor workmanship
- Problem returned
- Unexpected charges
- Damage during repair
- Inappropriate behavior
- Other

**Main Flow:**
1. Customer chooses related job/request where applicable.
2. Selects category.
3. Enters description.
4. Uploads evidence.
5. Complaint created as `OPEN`.
6. Admin queue updated.

---

## UC-CMP-002 — Provider Submits Complaint

**Possible Categories:** Fraudulent request, abusive customer, customer no-show, spam, false complaint, other.

---

## UC-CMP-003 — Admin Reviews Complaint

**Actor:** Complaint admin

**Main Flow:**
1. Complaint assigned.
2. State becomes `UNDER_REVIEW`.
3. Admin reviews job/request/evidence.
4. Admin may request more information.

---

## UC-CMP-004 — Request Customer Information

**State:** `WAITING_FOR_CUSTOMER`.

**Business Rule:** Customer receives only information required for their response.

---

## UC-CMP-005 — Request Provider Information

**State:** `WAITING_FOR_PROVIDER`.

---

## UC-CMP-006 — Resolve Complaint

**Actor:** Authorized Admin

**Main Flow:**
1. Admin records outcome and reason.
2. Complaint becomes `RESOLVED`.
3. Relevant separate actions (refund review, suspension review, warranty/remedial work) are initiated if applicable.
4. Audit event recorded.
5. Parties notified according to policy.

**Business Rule:** Complaint resolution and provider suspension are separate audited decisions.

---

## UC-CMP-007 — Reject Complaint

**Rule:** Reason required; complaint remains historical.

---

# 19. Subscription Use Cases

## UC-SUB-001 — View Subscription Plans

**Actor:** Provider

**Data:** Plan, price, duration, features, grace policy where shown.

---

## UC-SUB-002 — Select Plan and Duration

**Possible Durations:** 1, 3, 6, 12 months unless changed by configuration.

**Business Rule:** Plans/prices are data-driven and never hard-coded into eligibility logic.

---

## UC-SUB-003 — Activate Subscription From Verified Payment

**Actor:** System

**Precondition:** Authoritative payment success.

**Main Flow:**
1. Payment success validated.
2. Subscription is created/renewed.
3. State becomes `ACTIVE`.
4. Entitlement dates recorded.
5. Provider eligibility recalculated.

---

## UC-SUB-004 — Renewal Due

**Actor:** System

**Main Flow:** At configured threshold before expiry, subscription becomes/remains renewal-due state and provider notified.

---

## UC-SUB-005 — Grace Period

**Actor:** System

**Business Rule:** Grace behavior is configurable; eligibility during grace follows plan/policy, not UI assumptions.

---

## UC-SUB-006 — Expire Subscription

**Actor:** System

**Effects:**
- No new marketplace visibility/leads unless grace qualifies.
- Provider can still log in.
- Historical jobs/payments remain accessible.
- Renewal remains available.

---

## UC-SUB-007 — Renew Expired Subscription

**Actor:** Provider/System

**Main Flow:** Verified renewal payment -> subscription becomes active -> eligibility recalculated.

---

## UC-SUB-008 — Admin Extends Subscription

**Actor:** Admin with subscription-management permission

**Rules:** Reason mandatory; audit required; historical payment records unchanged.

---

# 20. Payment Use Cases

## UC-PAY-001 — Initiate Subscription Payment

**Actor:** Provider

**Main Flow:**
1. Provider chooses plan/duration.
2. Server calculates authoritative amount.
3. Payment record created as `INITIATED/PENDING`.
4. Gateway session/order created.
5. Provider redirected/opened to gateway.

**Business Rule:** Client-supplied amount is not trusted.

---

## UC-PAY-002 — Handle Browser Return

**Actor:** Provider/browser

**Main Flow:**
1. Provider returns from gateway.
2. UI shows `Confirming payment`.
3. Backend checks authoritative payment state.

**Business Rule:** Browser success parameter never directly sets `SUCCEEDED`.

---

## UC-PAY-003 — Process Payment Webhook

**Actor:** Payment Gateway

**Main Flow:**
1. Webhook received.
2. Signature/authenticity validated.
3. External transaction/event uniqueness checked.
4. Event processed idempotently.
5. Payment state updated.
6. Subscription entitlement updated only when warranted.
7. Audit/reconciliation metadata recorded.

**Failure Flow:** Invalid signature -> reject without entitlement.

---

## UC-PAY-004 — Reconcile Uncertain Payment

**Actor:** System/Admin

**Precondition:** Payment is pending/unknown/mismatch.

**Main Flow:** Gateway queried or evidence reviewed; payment becomes success/failure/requires-review based on authoritative evidence.

---

## UC-PAY-005 — Process Refund/Reversal

**Actor:** Gateway/Admin according to integration

**Business Rule:** Refund/reversal updates payment history and triggers approved subscription policy without rewriting original transaction history.

---

# 21. Notification Use Cases

## UC-NOT-001 — Send Repair Lifecycle Notification

**Events Include:**
- Request submitted
- Provider assigned
- Provider accepted
- Inspection scheduled
- Inspection completed
- Quote submitted
- Quote approved/rejected
- Repair started
- Waiting for parts
- Repair completed
- Confirmation required
- Complaint update
- Warranty update
- Subscription renewal due/expired
- Payment success/failure

**Channels:** In-app, SMS, email, WhatsApp where integrated.

**Business Rule:** Optional notification failure does not undo business transaction.

---

## UC-NOT-002 — Retry Failed Notification

**Actor:** Background worker

**Rules:** Retry limits/backoff configured; attempt history recorded; no uncontrolled duplicate spam.

---

# 22. Service Catalogue Admin Use Cases

## UC-SRV-001 — Create Service Category

**Actor:** Admin with service-manage permission.

**Fields:** Code, name, description, display order, active.

---

## UC-SRV-002 — Create Subcategory

**Actor:** Admin.

**Rule:** Parent category must be valid and active/allowed.

---

## UC-SRV-003 — Create Exact Repair Service

**Actor:** Admin

**Main Flow:**
1. Admin selects parent subcategory.
2. Enters unique code/name.
3. Configures description/qualification requirement/display order.
4. Enables service.
5. Service becomes available for new provider/customer flows.

**Business Rule:** Adding a normal new repair service should require data/configuration only, not application-code changes.

---

## UC-SRV-004 — Disable / Archive Service

**Business Rules:**
- Not selectable for new activity.
- Historical request/job references remain intact.
- Hard deletion of referenced service prohibited in normal admin flow.

---

# 23. Location Admin Use Cases

## UC-LOC-001 — Create Location

**Actor:** Admin

**Hierarchy:** Maldives → region/city/atoll → island/locality as finalized.

---

## UC-LOC-002 — Enable Marketplace Location

**Effect:** Location becomes available for new search/request/service-area configuration.

---

## UC-LOC-003 — Disable / Archive Location

**Business Rule:** New marketplace activity blocked; historical records preserved.

---

# 24. Admin Operational Use Cases

## UC-ADM-001 — Admin Login With MFA

**Actor:** Admin

**Rule:** Production admin access requires MFA before privileged screens/actions.

---

## UC-ADM-002 — View Admin Dashboard

**Displays:**
- Pending provider verification
- Unassigned requests
- Active repairs
- Waiting for parts
- Pending quotes
- Payment issues
- Expiring subscriptions
- Open complaints
- Warranty claims

---

## UC-ADM-003 — View Repair Request Detail

**Actor:** Authorized Admin

**Data:** Customer, provider, service, location, description, attachments, assignment, inspection, quote, job state, complaints, timeline.

---

## UC-ADM-004 — Correct Job State

**Actor:** High-privilege Admin

**Rules:**
- Only when operationally necessary.
- Reason mandatory.
- Original history retained.
- Audit event mandatory.

---

## UC-ADM-005 — Manage Subscription Plan

**Actor:** Subscription Admin

**Actions:** Create, edit, activate, archive plans.

**Business Rule:** Price changes affect new transactions according to policy and never rewrite historical payment amounts.

---

## UC-ADM-006 — Manage Feature / System Configuration

**Actor:** High-privilege Admin

**Examples:** Grace period, lead fan-out, marketplace settings, notification templates, feature flags.

**Business Rule:** Critical production configuration changes are audited.

---

# 25. Reporting Use Cases

## UC-RPT-001 — View Repair Operations Report

**Metrics:**
- Requests by day/month
- Requests by category/service/location
- Jobs assigned
- Completion rate
- Cancellation rate
- Average completion time
- Waiting-for-parts volume

---

## UC-RPT-002 — View Technician Performance Report

**Metrics:**
- Assignments
- Acceptance rate
- Response time
- Completion rate
- Ratings
- Complaints

---

## UC-RPT-003 — View Quotation Report

**Metrics:** Quotes issued, approved, rejected, expired, average quote amount.

---

## UC-RPT-004 — View Subscription / Revenue Report

**Metrics:** Active, expiring, expired subscriptions; verified subscription revenue; renewals.

**Business Rule:** Failed/pending payments are excluded from recognized successful-payment totals.

---

## UC-RPT-005 — View Supply / Demand Report

**Example:** Hulhumalé + AC Not Cooling -> request count vs eligible-provider count.

**Purpose:** Detect high-demand/low-supply service areas.

---

# 26. Audit Use Cases

## UC-AUD-001 — Record Critical Admin Action

**Events Must Include:**
- Provider approve/reject/suspend/reactivate
- Verification decision
- Manual assignment/reassignment
- Job correction
- Subscription override
- Payment correction
- Service/location master change
- Review moderation
- Complaint resolution
- Warranty administrative change
- Configuration/feature flag change

**Audit Fields:**
- Actor
- Action
- Entity type/id
- Previous state/value where applicable
- New state/value
- Reason
- Timestamp
- Request/correlation ID

---

## UC-AUD-002 — View Audit Log

**Actor:** Admin with `audit.view`

**Business Rule:** Audit history is read-only through normal administrative UI/API.

---

# 27. Key State Machines

## 27.1 Provider

`DRAFT → PENDING_VERIFICATION → INFORMATION_REQUIRED / PENDING_APPROVAL → APPROVED / REJECTED`

Administrative override:

`APPROVED → SUSPENDED → APPROVED`

Archive path is separate and historical.

---

## 27.2 Verification

`NOT_SUBMITTED → SUBMITTED → UNDER_REVIEW → VERIFIED / INFORMATION_REQUIRED / REJECTED`

Later:

`VERIFIED → EXPIRED / REVOKED`

---

## 27.3 Repair Request

`DRAFT → SUBMITTED → MATCHING → OPEN / ASSIGNED → ACCEPTED → JOB_CREATED/CLOSED`

Alternative:

`SUBMITTED/OPEN → CANCELLED / EXPIRED`

---

## 27.4 Lead

`PENDING → SENT → VIEWED → ACCEPTED / DECLINED / EXPIRED / CLOSED`

---

## 27.5 Inspection

`NOT_SCHEDULED → SCHEDULED → IN_PROGRESS → COMPLETED`

---

## 27.6 Quotation

`DRAFT → SUBMITTED → VIEWED → APPROVED / REJECTED / EXPIRED / CANCELLED`

Revisions create new version/history rather than destructive overwrite.

---

## 27.7 Repair Job

`ASSIGNED → ACCEPTED → INSPECTION_SCHEDULED → INSPECTED → QUOTE_PENDING → QUOTE_APPROVED → REPAIR_SCHEDULED → IN_PROGRESS → REPAIR_COMPLETED → CUSTOMER_CONFIRMATION → FINALIZED`

Alternative states:

- `WAITING_FOR_PARTS`
- `ON_HOLD`
- `DISPUTED`
- `CANCELLED`
- `UNABLE_TO_REPAIR`

---

## 27.8 Subscription

`TRIAL / PENDING_PAYMENT → ACTIVE → RENEWAL_DUE → GRACE_PERIOD → EXPIRED`

Alternative:

- `CANCELLED`
- `SUSPENDED`
- `EXPIRED → ACTIVE` after verified renewal

---

## 27.9 Payment

`INITIATED → PENDING → SUCCEEDED / FAILED / REQUIRES_REVIEW`

After success:

`SUCCEEDED → REFUNDED / REVERSED`

---

## 27.10 Complaint

`OPEN → UNDER_REVIEW → WAITING_FOR_CUSTOMER / WAITING_FOR_PROVIDER → UNDER_REVIEW → RESOLVED / REJECTED → CLOSED`

---

## 27.11 Warranty

`ACTIVE → EXPIRED / VOID / CLAIMED`

Warranty-claim lifecycle should be finalized in the dedicated state-machine step.

---

# 28. Critical Cross-Entity Business Rules

## BR-X-001 — Paid Does Not Mean Approved
Provider with successful subscription payment but pending/rejected approval is not marketplace eligible.

## BR-X-002 — Approved Does Not Mean Paid
Approved provider with expired/non-qualifying subscription is not marketplace eligible.

## BR-X-003 — Suspension Overrides Everything
Suspension blocks new search exposure/leads regardless of availability, subscription, rating, or featured status.

## BR-X-004 — Exact Skill Matching
Provider must explicitly have the exact requested service active.

## BR-X-005 — Location Matching
Provider must explicitly serve the requested active location.

## BR-X-006 — Active Jobs Survive Eligibility Loss
Subscription expiry or suspension does not erase historical/active job records.

## BR-X-007 — Customer Ownership
Customer can act only on requests/jobs/quotes/reviews/complaints/warranties that belong to them unless a public view explicitly exists.

## BR-X-008 — Quote Approval Is Version-Specific
Approval applies only to the current submitted quotation version.

## BR-X-009 — Review Uniqueness
One verified review per eligible completed job.

## BR-X-010 — Complaint Is Not Automatic Guilt
Complaint creation alone does not automatically suspend provider or prove fault.

## BR-X-011 — Payment Webhook Idempotency
Duplicate/replayed payment callbacks cannot duplicate entitlement.

## BR-X-012 — Historical Price Integrity
Changing service/plan prices does not rewrite historical quote/payment/job values.

---

# 29. Concurrency Rules

## CONC-001 — Request Cancellation vs Provider Acceptance
System must atomically determine which valid transition commits first; losing action receives conflict response.

## CONC-002 — Two Provider Acceptances
Behavior follows selected distribution model. If exclusive winner is required, only one can win atomically.

## CONC-003 — Duplicate Payment Webhook
Only one authoritative entitlement update.

## CONC-004 — Duplicate Request Submit
Only one logical repair request.

## CONC-005 — Duplicate Review Submit
Database-level uniqueness prevents duplicate verified review.

## CONC-006 — Simultaneous Admin Decisions
Stale conflicting provider/verification/job updates must be rejected or version-controlled.

---

# 30. Data Privacy Rules

## Public
May include approved provider profile, services, pricing, service areas, availability, reviews, rating, gallery, verification badges, and approved contact methods.

## Private
Must include identity documents, business-registration files, qualification evidence, customer addresses beyond intended job access, complaints, payment metadata, internal admin notes, audit/security metadata, private phone preferences, and authentication data.

## BR-PRIV-001
Private verification files require authenticated, authorized, time-limited access.

## BR-PRIV-002
Customer/job data exposed to provider must be limited to what is necessary for assigned repair work.

## BR-PRIV-003
Public reviews must not expose sensitive customer data.

---

# 31. Open Decisions to Freeze Before Database/API Design

## OD-001 — Lead Distribution
Recommended: progressive ranked distribution.

## OD-002 — Customer Choice vs First-Accept
Recommended: allow provider responses and let customer choose for marketplace-style requests; support direct-provider booking as a separate flow where the customer starts from a provider profile.

## OD-003 — Direct Booking
Decision required: when customer starts from a provider profile, should the request be exclusive to that provider initially or return to marketplace matching if declined/expired?

**Recommended:** exclusive first offer with configurable timeout, then offer customer a choice to broaden matching.

## OD-004 — Cancellation Cutoffs
Need explicit policy for cancellation after inspection/quote approval/repair start.

## OD-005 — Quote Revision
Recommended: versioned re-quote with mandatory customer re-approval.

## OD-006 — Auto-Finalization
Recommended: provider marks complete → customer confirm/dispute → auto-finalize after configurable period.

## OD-007 — Warranty Claim Ownership
Decide whether provider handles first-line warranty claims directly or admin triages first.

**Recommended:** provider receives claim, admin has oversight/intervention.

## OD-008 — Payment Scope
Provider subscription payments are in scope. Customer payment for repair service should remain out of MVP unless separately approved.

## OD-009 — Business Staff
Recommended: architecture-ready but defer detailed staff assignment until later unless needed for launch.

---

# 32. Step 3 Approval Checklist

## Actors & Roles
- [ ] Visitor approved
- [ ] Customer approved
- [ ] Provider/Technician approved
- [ ] Business Provider approved
- [ ] Admin approved
- [ ] System automation approved

## Customer Flow
- [ ] Authentication approved
- [ ] Search approved
- [ ] Repair request approved
- [ ] Cancellation rules approved
- [ ] Repair tracking approved
- [ ] Quote approval/rejection approved
- [ ] Completion confirmation approved
- [ ] Review approved
- [ ] Complaint approved
- [ ] Warranty claim approved

## Provider Flow
- [ ] Onboarding approved
- [ ] Verification approved
- [ ] Exact services approved
- [ ] Service areas approved
- [ ] Pricing approved
- [ ] Availability approved
- [ ] Lead acceptance approved
- [ ] Inspection approved
- [ ] Diagnosis approved
- [ ] Quotation approved
- [ ] Repair progress approved
- [ ] Parts/labour recording approved
- [ ] Completion approved

## Admin Flow
- [ ] Provider approval approved
- [ ] Suspension/reactivation approved
- [ ] Assignment/reassignment approved
- [ ] Complaint handling approved
- [ ] Warranty oversight approved
- [ ] Master-data management approved
- [ ] Reporting approved
- [ ] Audit approved

## Business Rules
- [ ] Eligibility rule approved
- [ ] Subscription rule approved
- [ ] Payment integrity rule approved
- [ ] Concurrency rules approved
- [ ] Historical-retention rule approved
- [ ] Privacy separation approved

## Open Decisions
- [ ] OD-001 resolved
- [ ] OD-002 resolved
- [ ] OD-003 resolved
- [ ] OD-004 resolved
- [ ] OD-005 resolved
- [ ] OD-006 resolved
- [ ] OD-007 resolved
- [ ] OD-008 resolved
- [ ] OD-009 resolved/deferred

---

# 33. Development Gate

**Step 3 should be approved before finalizing Step 4 Database Schema.**

The database, API contracts, permission matrix, state-machine enforcement, and test cases must be derived from these approved functional rules rather than invented independently during coding.

Recommended next sequence:

1. Step 4 — Complete Database Schema & Data Dictionary
2. Step 5 — API Contracts
3. Step 6 — Roles & Permission Matrix
4. Step 7 — Formal State Transition Matrices
5. Step 8 — Test Cases & Acceptance Criteria
6. Development
