# iFixIt — Step 4: Final UI & Screen Specification

**Document Type:** UI Implementation Specification  
**Status:** Draft for approval before functional freeze and database design  
**Version:** 1.0  
**Date:** 2026-08-19

---

# 1. Purpose

This document defines the complete iFixIt user interface in four practical levels:

1. **Level 1 — User Journey UI**
2. **Level 2 — Screen / Page UI**
3. **Level 3 — Component UI**
4. **Level 4 — State & Interaction UI**

The goal is to remove UI ambiguity before database, API, permissions, state-transition enforcement, testing, and coding are finalized.

Every important screen should be traceable to:

`Journey → Screen → Component → Interaction State → Use Case → Business Rule`

The frontend is not authoritative for protected business rules. UI visibility and enabled/disabled state must reflect server-authorized actions.

---

# 2. Global UI Principles

## UI-GEN-001 — Mobile First
Customer and provider experiences must be designed mobile-first. Desktop layouts may add density but must preserve the same business capabilities.

## UI-GEN-002 — Admin Desktop First
The admin portal is desktop-first because of tables, filters, operational queues, reports, and multi-column detail views. Tablet support is required; mobile admin may be limited to essential actions.

## UI-GEN-003 — Status Visibility
Every repair-related screen must clearly display the current state and the next valid action.

## UI-GEN-004 — Action Safety
Irreversible or high-impact actions require confirmation where appropriate, including cancellation, provider suspension, admin reassignment, quotation approval, complaint resolution, and state correction.

## UI-GEN-005 — No Silent Failure
All failed user actions must produce a visible error state with recovery guidance where possible.

## UI-GEN-006 — Preserve Form Work
Where practical, validation or upload failure must not erase valid user-entered data.

## UI-GEN-007 — Permission-Aware UI
The UI must not show actions the current user cannot perform. The server must still independently enforce authorization.

## UI-GEN-008 — Accessibility
Forms need labels, clear validation, keyboard accessibility, meaningful focus states, readable contrast, accessible status text, and non-color-only status communication.

## UI-GEN-009 — Responsive Consistency
Mobile and desktop must use the same underlying terminology, status names, and business rules.

## UI-GEN-010 — Data Privacy
Private documents, customer addresses, internal notes, payment metadata, complaint evidence, and audit details must only appear in authorized contexts.

---

# 3. Level 1 — User Journey UI

Level 1 defines the full experience from the user's point of view.

---

## L1-CUS-01 — Customer Gets a Repair Completed

### Journey

`Home / Search`
→ `Select Location`
→ `Select Exact Service`
→ `View Providers or Start Marketplace Request`
→ `Create Repair Request`
→ `Submit`
→ `Matching / Assignment`
→ `Technician Assigned`
→ `Inspection Scheduled`
→ `Inspection Completed`
→ `Quotation Received`
→ `Approve / Reject Quote`
→ `Repair In Progress`
→ `Waiting for Parts if needed`
→ `Repair Completed`
→ `Customer Confirms / Disputes`
→ `Review`
→ `Warranty`

### Primary Customer Navigation

- Home
- Find Repair
- My Repairs
- Notifications
- Profile

### Important Customer UI Goals

- User should always know the current repair status.
- User should never need to understand internal system terminology.
- Important actions must be surfaced at the right status.
- Repair history must remain available after completion.

### Related Use Cases

- `UC-SEA-*`
- `UC-REQ-*`
- `UC-MAT-*`
- `UC-INSP-*`
- `UC-QUO-*`
- `UC-JOB-*`
- `UC-WAR-*`
- `UC-REV-*`
- `UC-CMP-*`

---

## L1-CUS-02 — Customer Books a Specific Provider

### Journey

`Search`
→ `Provider Profile`
→ `Request Repair from This Provider`
→ `Repair Request`
→ `Provider Accept / Decline`
→ if accepted: normal repair journey
→ if declined/expired: broaden matching according to final business policy

### UI Requirement

The screen must clearly tell the customer whether the request is:

- exclusive to the selected provider, or
- also available to other matching providers.

This behavior depends on the final direct-booking business rule.

---

## L1-CUS-03 — Customer Handles a Problem After Repair

### Journey

`Completed Repair`
→ `Report Problem`
→ `Dispute / Complaint`
→ `Provide Evidence`
→ `Admin / Provider Response`
→ `Resolution`

Alternative:

`Warranty`
→ `Submit Warranty Claim`
→ `Review`
→ `Remedial Repair / Rejection / Closure`

---

## L1-PRV-01 — Provider Joins iFixIt

### Journey

`Login`
→ `Become a Provider`
→ `Choose Individual / Business`
→ `Profile`
→ `Services`
→ `Service Areas`
→ `Pricing`
→ `Verification`
→ `Subscription`
→ `Submit Application`
→ `Pending Review`
→ `Approved`
→ `Marketplace Eligible`

### Provider Onboarding UI Goals

- Show onboarding progress.
- Show missing requirements.
- Separate payment success from provider approval.
- Clearly display verification and subscription states.

---

## L1-PRV-02 — Provider Handles a Repair

### Journey

`Provider Dashboard`
→ `New Assignment / Lead`
→ `View Request`
→ `Accept / Decline`
→ `Contact Customer`
→ `Schedule Inspection`
→ `Record Diagnosis`
→ `Create Quote`
→ `Wait for Customer Approval`
→ `Start Repair`
→ `Update Progress`
→ `Parts / Labour`
→ `Complete Repair`
→ `Warranty`
→ `Customer Confirmation`

---

## L1-PRV-03 — Provider Manages Availability and Marketplace Eligibility

### Journey

`Dashboard`
→ `Availability`
→ `Accepting Leads On/Off`
→ `Services`
→ `Service Areas`
→ `Subscription`
→ `Verification`

### UI Requirement

Provider must be able to see **why** they are not eligible for new work, for example:

- verification incomplete
- provider not approved
- subscription expired
- suspended
- no active service area
- no active exact service
- not accepting leads

---

## L1-ADM-01 — Admin Operates Marketplace

### Journey

`Admin Login + MFA`
→ `Dashboard`
→ `Provider Verification`
→ `Provider Approval`
→ `Repair Requests`
→ `Assignments`
→ `Jobs`
→ `Complaints`
→ `Warranty Claims`
→ `Subscriptions / Payments`
→ `Reports`
→ `Audit`

### Admin UI Goals

- Action-required queues first.
- Strong filters and search.
- Detailed status history.
- Every privileged action shows actor, reason, time, and result.

---

# 4. Level 2 — Screen / Page UI

This section defines the main screens and routes.

---

# 4.1 Public & Authentication Screens

## SCR-PUB-001 — Landing / Home

**Suggested Route:** `/`  
**Actor:** Visitor / Customer  
**Purpose:** Start repair discovery quickly.

### Main Content
- Location selector
- Service search
- Popular repair categories
- How it works
- Trust / verification explanation
- Provider CTA
- Login/Profile entry

### Primary Actions
- Find Repair
- Select Location
- Browse Services
- Login
- Become a Provider

### Related Use Cases
`UC-SEA-001`, `UC-SEA-002`, `UC-AUTH-*`

---

## SCR-AUTH-001 — Phone Login

**Suggested Route:** `/login`

### Components
- Phone number field
- Country code
- Continue button
- Legal / privacy copy

### States
- Initial
- Validating
- OTP sending
- Invalid number
- Rate limited
- Provider unavailable
- Success → OTP screen

---

## SCR-AUTH-002 — OTP Verification

**Suggested Route:** `/verify`

### Components
- Masked phone number
- OTP input
- Countdown
- Resend
- Change number
- Verify button

### States
- Waiting input
- Verifying
- Incorrect code
- Expired code
- Attempt limit
- Success

---

# 4.2 Customer Discovery Screens

## SCR-CUS-001 — Service Catalogue / Search

**Suggested Route:** `/services`

### Main Content
- Search input
- Category list
- Subcategory list
- Exact repair services
- Location context

### Actions
- Select category
- Select exact service
- Change location
- Continue to provider results/request

---

## SCR-CUS-002 — Provider Search Results

**Suggested Route:** `/providers`

### Main Content
- Search summary
- Filter/sort controls
- Provider cards
- Result count

### Filters
- Availability
- Verification
- Rating
- Provider type
- Pricing type
- Price range
- Experience

### Empty State
- No providers available
- Suggest broaden area/service where safe
- Offer marketplace request if supported

---

## SCR-CUS-003 — Public Provider Profile

**Suggested Route:** `/providers/{providerId}`

### Displays
- Provider name / business name
- Image/logo
- Verified badges
- Rating
- Review count
- Services
- Service areas
- Pricing type
- Availability
- Description
- Gallery
- Reviews

### Actions
- Request Repair
- Contact where permitted
- Back to results

### Hidden
- Identity documents
- Internal notes
- Complaints
- Payment details
- Non-public contact data

---

# 4.3 Customer Repair Request Screens

## SCR-REQ-001 — Create Repair Request

**Suggested Route:** `/repairs/new`

### Sections
1. Service
2. Item/equipment
3. Problem
4. Location
5. Schedule / urgency
6. Photos/video
7. Contact/access instructions
8. Review

### Fields
- Exact service
- Item/equipment type
- Brand
- Model
- Serial number optional
- Problem description
- Island/city/location
- Address
- Access notes
- Urgency
- Preferred date/time
- Photos
- Optional video

### Actions
- Save Draft
- Back
- Continue
- Submit

---

## SCR-REQ-002 — Repair Request Review

**Suggested Route:** `/repairs/new/review`

### Displays
- Service
- Item
- Problem
- Location
- Urgency
- Preferred schedule
- Attachments
- Contact details

### Actions
- Edit section
- Submit Request

---

## SCR-REQ-003 — Request Submitted

**Suggested Route:** `/repairs/{requestId}/submitted`

### Displays
- Ticket ID
- Confirmation message
- Current status
- What happens next

### Actions
- Track Repair
- Return Home

---

# 4.4 Customer Repair Management Screens

## SCR-CUS-004 — My Repairs

**Suggested Route:** `/repairs`

### Tabs / Filters
- Active
- Waiting for Me
- Completed
- Cancelled
- All

### Repair Card
- Ticket
- Exact service
- Provider
- Location
- Status
- Last update
- Next action

---

## SCR-CUS-005 — Repair Detail / Tracking

**Suggested Route:** `/repairs/{jobOrRequestId}`

### Core Sections
- Ticket summary
- Current status banner
- Next action card
- Technician/provider card
- Inspection card
- Quotation card
- Progress timeline
- Photos/media
- Parts/labour summary where appropriate
- Warranty
- Complaint/dispute
- Activity history

### Status-Driven Actions

**SUBMITTED / MATCHING**
- Cancel Request where allowed

**TECHNICIAN_ASSIGNED / ASSIGNED**
- View Technician
- Contact Technician where enabled

**INSPECTION_SCHEDULED**
- View appointment details
- Contact Technician

**QUOTE_SUBMITTED**
- View Quote
- Approve
- Reject

**IN_PROGRESS**
- View Progress
- Contact Technician

**WAITING_FOR_PARTS**
- View reason/parts update

**REPAIR_COMPLETED / CUSTOMER_CONFIRMATION**
- Confirm Completion
- Report Problem

**FINALIZED**
- Leave Review
- View Warranty
- View History

---

## SCR-CUS-006 — Quotation Detail

**Suggested Route:** `/repairs/{id}/quotation`

### Displays
- Provider
- Quote version
- Labour lines
- Parts lines
- Fees
- Discounts
- Tax if applicable
- Total
- Estimated duration
- Expiry date
- Notes

### Actions
- Approve
- Reject
- Back to Repair

### Important UI Rule
Approval must clearly identify the exact current quote version and total.

---

## SCR-CUS-007 — Confirm Completion

**Suggested Route:** `/repairs/{id}/complete`

### Displays
- Completion notes
- Final photos
- Final parts/labour summary
- Warranty summary

### Actions
- Confirm Completion
- Report Problem

---

## SCR-CUS-008 — Submit Review

**Suggested Route:** `/repairs/{id}/review`

### Fields
- Quality
- Punctuality
- Communication
- Professionalism
- Value for money
- Written feedback

### States
- Eligible
- Already reviewed
- Edit window open
- Edit window closed

---

## SCR-CUS-009 — Warranty Detail

**Suggested Route:** `/repairs/{id}/warranty`

### Displays
- Status
- Start/end
- Covered repair
- Covered parts
- Terms

### Action
- Submit Warranty Claim if eligible

---

## SCR-CUS-010 — Warranty Claim Form

**Suggested Route:** `/warranties/{warrantyId}/claim`

### Fields
- Problem description
- Recurrence details
- Evidence/photos

### Actions
- Submit Claim

---

## SCR-CUS-011 — Complaint / Dispute Form

**Suggested Route:** `/repairs/{id}/complaint`

### Fields
- Category
- Description
- Evidence

### Actions
- Submit Complaint

---

# 4.5 Customer Profile Screens

## SCR-CUS-012 — Customer Profile

**Suggested Route:** `/profile`

### Displays / Edits
- Full name
- Verified phone
- Email
- Default location
- Notification preferences

### Protected Action
- Change verified phone → dedicated re-verification flow

---

# 4.6 Provider Onboarding Screens

## SCR-PRV-001 — Provider Onboarding Home

**Suggested Route:** `/provider/onboarding`

### Progress Steps
1. Provider Type
2. Profile
3. Services
4. Service Areas
5. Pricing
6. Verification
7. Subscription
8. Review & Submit

### Status Summary
- Complete
- Incomplete
- Needs attention
- Under review

---

## SCR-PRV-002 — Provider Type

### Options
- Individual Technician
- Business Provider

---

## SCR-PRV-003 — Provider Profile

### Fields
- Public name
- Business name
- Representative
- Photo/logo
- Description
- Years experience
- Contact preferences

---

## SCR-PRV-004 — Provider Services

### Components
- Category accordion/tree
- Exact-service checkboxes
- Qualification indicators
- Selected services summary

---

## SCR-PRV-005 — Provider Service Areas

### Components
- Location search
- Island/city list
- Selected service areas

---

## SCR-PRV-006 — Provider Pricing

### Per-Service Inputs
- Pricing type
- Amount when applicable
- Notes

---

## SCR-PRV-007 — Provider Verification

### Sections
- Identity verification
- Business verification if applicable
- Qualification evidence

### Displays
- Submission status
- Review status
- Information requested
- Rejected reason
- Verified state

---

## SCR-PRV-008 — Provider Subscription

### Displays
- Plans
- Price
- Duration
- Features
- Current entitlement status

### Actions
- Select Plan
- Pay
- Renew

### Important UI Rule
Payment success must not be presented as provider approval.

---

## SCR-PRV-009 — Review & Submit Application

### Displays
- Profile completeness
- Services
- Areas
- Verification
- Subscription
- Terms acceptance

### Actions
- Edit section
- Submit Application

---

# 4.7 Provider Operational Screens

## SCR-PRV-010 — Provider Dashboard

**Suggested Route:** `/provider`

### Dashboard Cards
- Availability
- New Requests
- Awaiting Acceptance
- Today’s Inspections
- Quote Pending
- Approved Repairs
- In Progress
- Waiting for Parts
- Completed
- Complaints
- Rating
- Subscription

### Action Required Panel
- verification information requested
- subscription renewal required
- assignment awaiting response
- quotation action
- complaint response

---

## SCR-PRV-011 — Provider Availability

**Suggested Route:** `/provider/availability`

### Controls
- Available Now
- Available Today
- By Appointment
- Unavailable
- Accepting Leads On/Off

### Displays
- Marketplace eligibility explanation

---

## SCR-PRV-012 — Provider Requests / Leads

**Suggested Route:** `/provider/requests`

### Tabs
- New
- Accepted
- Declined
- Expired

### Lead Card
- Service
- Location
- Urgency
- Preferred schedule
- Short problem summary
- Expiry/response deadline

### Actions
- View
- Accept
- Decline

---

## SCR-PRV-013 — Provider Repair Detail

**Suggested Route:** `/provider/repairs/{id}`

### Sections
- Customer/job summary
- Contact/action area
- Inspection
- Diagnosis
- Quote
- Progress
- Parts
- Labour
- Photos
- Warranty
- Complaint
- Timeline

### Status-Driven Actions
- Accept / Decline
- Schedule Inspection
- Start Inspection
- Complete Inspection
- Create Quote
- Submit Quote
- Start Repair
- Add Progress
- Waiting for Parts
- Resume Repair
- Mark Complete

---

## SCR-PRV-014 — Inspection Editor

**Suggested Route:** `/provider/repairs/{id}/inspection`

### Fields
- Scheduled date/time
- Diagnosis
- Fault
- Recommended repair
- Required parts
- Labour estimate
- Repair duration estimate
- Photos
- Customer-visible notes
- Internal notes if supported

---

## SCR-PRV-015 — Quotation Editor

**Suggested Route:** `/provider/repairs/{id}/quotation`

### Components
- Labour line editor
- Parts line editor
- Additional fees
- Discount
- Tax
- Total
- Duration
- Expiry
- Notes

### Actions
- Save Draft
- Submit
- Create Revision

### UI Rule
Previous submitted versions are read-only.

---

## SCR-PRV-016 — Repair Progress

**Suggested Route:** `/provider/repairs/{id}/progress`

### Components
- Progress timeline
- Add note
- Upload photo
- Customer-visible toggle if permitted

---

## SCR-PRV-017 — Parts & Labour

**Suggested Route:** `/provider/repairs/{id}/costs`

### Part Fields
- Name
- Part number
- Brand
- Qty
- Unit price
- Supplier/reference
- Installed date
- Warranty

### Labour Fields
- Description
- Hours
- Rate
- Amount

---

## SCR-PRV-018 — Complete Repair

**Suggested Route:** `/provider/repairs/{id}/complete`

### Required
- Completion notes
- Final photos if configured
- Final parts/labour
- Warranty details if offered

### Action
- Mark Repair Complete

---

## SCR-PRV-019 — Provider Reviews

**Suggested Route:** `/provider/reviews`

### Displays
- Aggregate rating
- Rating dimensions
- Verified reviews
- Moderation status where relevant

---

## SCR-PRV-020 — Provider Complaints

**Suggested Route:** `/provider/complaints`

### Displays
- Open complaints
- Requested information
- Status
- response deadline where applicable

---

# 4.8 Admin Screens

## SCR-ADM-001 — Admin Login + MFA

**Suggested Route:** `/admin/login`

### States
- Credentials accepted
- MFA required
- MFA failed
- Locked/rate-limited
- Authenticated

---

## SCR-ADM-002 — Admin Dashboard

**Suggested Route:** `/admin`

### Action-Required Queues
- Provider verification
- Provider approval
- Unassigned repair requests
- Active disputes/complaints
- Warranty claims
- Payment issues
- Expiring/expired subscriptions
- Jobs needing intervention

### KPI Cards
- Active providers
- Active repairs
- Pending quotations
- Waiting for parts
- Completed jobs

---

## SCR-ADM-003 — Provider Management

**Suggested Route:** `/admin/providers`

### Filters
- Status
- Verification
- Subscription
- Provider type
- Location
- Service
- Suspension

### Actions
- View
- Approve
- Reject
- Suspend
- Reactivate

---

## SCR-ADM-004 — Provider Detail

**Suggested Route:** `/admin/providers/{id}`

### Tabs
- Overview
- Verification
- Services
- Areas
- Subscription
- Payments
- Repairs
- Reviews
- Complaints
- Audit

### Privileged Actions
- Approve
- Reject
- Suspend
- Reactivate
- Request Information
- Subscription override where permitted

---

## SCR-ADM-005 — Repair Request Queue

**Suggested Route:** `/admin/requests`

### Filters
- Status
- Service
- Location
- Urgency
- Assignment state
- Age

### Actions
- View
- Assign
- Reassign

---

## SCR-ADM-006 — Admin Repair Detail

**Suggested Route:** `/admin/repairs/{id}`

### Tabs / Sections
- Customer
- Provider
- Service/location
- Problem/media
- Assignment
- Inspection
- Quote
- Job
- Parts/labour
- Warranty
- Complaint
- Timeline
- Audit

### Privileged Actions
- Assign/Reassign
- Correct Status
- Add internal note
- Open complaint review

---

## SCR-ADM-007 — Verification Queue

**Suggested Route:** `/admin/verifications`

### Actions
- Review
- Approve
- Request Information
- Reject

---

## SCR-ADM-008 — Complaint Queue

**Suggested Route:** `/admin/complaints`

### Filters
- Open
- Under Review
- Waiting Customer
- Waiting Provider
- Resolved
- Rejected

### Actions
- Assign reviewer
- Request information
- Resolve
- Reject

---

## SCR-ADM-009 — Warranty Claims

**Suggested Route:** `/admin/warranties`

### Displays
- Claim
- Original repair
- Warranty terms
- Customer evidence
- Provider response

---

## SCR-ADM-010 — Service Catalogue Management

**Suggested Route:** `/admin/services`

### Structure
`Category → Subcategory → Exact Service`

### Actions
- Create
- Edit
- Enable
- Disable
- Archive
- Reorder

---

## SCR-ADM-011 — Location Management

**Suggested Route:** `/admin/locations`

### Actions
- Create
- Edit
- Enable marketplace
- Disable
- Archive

---

## SCR-ADM-012 — Subscription Plan Management

**Suggested Route:** `/admin/subscriptions/plans`

### Actions
- Create plan
- Edit
- Activate
- Archive

---

## SCR-ADM-013 — Payments

**Suggested Route:** `/admin/payments`

### Filters
- Pending
- Success
- Failed
- Requires Review
- Refunded
- Reversed

### Actions
- View transaction
- Reconcile where permitted

---

## SCR-ADM-014 — Reports

**Suggested Route:** `/admin/reports`

### Sections
- Repair operations
- Provider performance
- Quotations
- Subscription/revenue
- Supply vs demand

---

## SCR-ADM-015 — Audit Log

**Suggested Route:** `/admin/audit`

### Filters
- Actor
- Action
- Entity
- Date range
- Correlation ID

### UI Rule
Read-only.

---

# 5. Level 3 — Component UI

This section defines reusable UI components.

---

## CMP-NAV-001 — Public Header
- Logo
- Find Repair
- Services
- Login/Profile
- Become a Provider

## CMP-NAV-002 — Customer Mobile Bottom Navigation
- Home
- Repairs
- Notifications
- Profile

## CMP-NAV-003 — Provider Navigation
- Dashboard
- Requests
- Repairs
- Quotations
- Reviews
- Warranty
- Services
- Areas
- Subscription
- Payments
- Notifications
- Profile

## CMP-NAV-004 — Admin Sidebar
- Dashboard
- Providers
- Verifications
- Requests
- Repairs
- Quotations
- Complaints
- Warranty
- Services
- Locations
- Subscriptions
- Payments
- Reports
- Audit
- Settings

---

## CMP-STA-001 — Status Badge

### Requirements
- Text + visual indicator
- Never color-only
- Standard status names
- Tooltip/help where status is not obvious

---

## CMP-STA-002 — Repair Progress Timeline

### Event Types
- Request submitted
- Technician assigned
- Inspection scheduled
- Inspection completed
- Quote submitted
- Quote approved/rejected
- Repair started
- Waiting for parts
- Repair resumed
- Repair completed
- Customer confirmed
- Dispute opened
- Finalized

### Requirements
- timestamp
- actor-safe description
- icon/indicator
- customer-visible events only on customer screens

---

## CMP-CRD-001 — Provider Card

### Displays
- Name
- Photo/logo
- Verification
- Rating
- Exact service
- Location/service area
- Availability
- Pricing type

### Action
- View Profile
- Request Repair

---

## CMP-CRD-002 — Repair Card

### Displays
- Ticket
- Service
- Provider/customer depending role
- Status
- Last update
- Next action

---

## CMP-CRD-003 — Action Required Card

### Displays
- Priority
- Required action
- Due/expiry where relevant
- One clear primary CTA

---

## CMP-FRM-001 — Form Field

### Supports
- Label
- Required marker
- Help text
- Validation message
- Character limit
- Disabled/read-only states

---

## CMP-FRM-002 — File Upload

### Supports
- Drag/drop desktop
- Mobile camera/gallery
- Progress
- Retry
- Remove
- File validation
- Preview

---

## CMP-FRM-003 — Location Selector

### Supports
- Search
- Recent/default location
- Active locations only
- Hierarchy if used

---

## CMP-FRM-004 — Exact Service Selector

### Supports
- Category
- Subcategory
- Exact service
- Search
- Active-only filtering

---

## CMP-QUO-001 — Quotation Summary Card
- Version
- Total
- Expiry
- Status
- Provider
- Approve/Reject where eligible

## CMP-QUO-002 — Quote Line Editor
- Item type
- Description
- Qty
- Unit price
- Amount
- Remove

## CMP-QUO-003 — Quote Totals
- Labour subtotal
- Parts subtotal
- Fees
- Discount
- Tax
- Grand total

---

## CMP-TBL-001 — Admin Data Table

### Supports
- Server-side pagination
- Search
- Filters
- Sort
- Column visibility where useful
- Bulk actions only where safe
- Empty state
- Loading skeleton

---

## CMP-MDL-001 — Confirmation Modal

### Use For
- Cancel repair
- Approve quotation
- Reject quotation where reason required
- Suspend provider
- Reassign job
- Correct state
- Resolve complaint

### Requirements
- Clear action consequence
- Explicit confirm button
- Cancel button
- Optional/required reason input

---

## CMP-MSG-001 — Inline Validation
- Field-level message
- Summary error when needed
- Focus first invalid field

## CMP-MSG-002 — Toast / Action Feedback
- Success
- Warning
- Error
- Non-blocking info

## CMP-MSG-003 — Empty State
- What happened
- What user can do next
- Primary action when available

## CMP-MSG-004 — Error State
- User-safe error
- Retry
- Contact/support path if unrecoverable

---

# 6. Level 4 — State & Interaction UI

Level 4 defines exact UI behavior during loading, empty, error, success, permission, device, and lifecycle states.

---

# 6.1 Universal Screen States

## UI-STATE-001 — Loading

### Rules
- Use skeletons for content-heavy screens.
- Buttons causing non-repeatable actions show progress and become temporarily disabled.
- Avoid full-page spinner where partial content can remain visible.

---

## UI-STATE-002 — Empty

### Examples
- No repair history
- No providers found
- No new leads
- No complaints

### Rules
- Explain why the screen is empty.
- Provide a next action where possible.

Example:

`No active repairs yet → Find a Repair Service`

---

## UI-STATE-003 — Error

### Rules
- Preserve user input where practical.
- Use retry for recoverable failures.
- Do not expose stack traces, internal IDs, secrets, SQL messages, or raw gateway errors.

---

## UI-STATE-004 — Success

### Rules
- Success shown only after server confirms the transaction.
- Critical actions should show resulting state or ticket/reference.

Example:

`Repair request submitted — IFX-2026-001245`

---

## UI-STATE-005 — Disabled

### Rules
A disabled action should have a clear reason when useful.

Examples:
- Quote already expired
- Provider not eligible
- Repair already finalized
- Missing required verification

---

## UI-STATE-006 — Unauthorized / Forbidden

### Rules
- Do not render private content before authorization is confirmed.
- Show Access Denied / Not Available.
- Do not reveal whether sensitive resource exists when security policy requires obscurity.

---

## UI-STATE-007 — Session Expired

### Rules
- Prompt re-authentication.
- Preserve draft data when safe.
- After login, return user to intended flow where technically possible.

---

# 6.2 Repair Lifecycle Interaction Rules

## UI-REPAIR-001 — DRAFT

Customer UI:
- Editable
- Save Draft
- Continue
- Delete draft where allowed

Provider/Admin:
- Not visible unless business process explicitly permits

---

## UI-REPAIR-002 — SUBMITTED / MATCHING

Customer:
- Show ticket
- Show matching status
- Cancel if policy allows

Provider:
- No access unless lead/assignment generated

Admin:
- View queue
- Assign manually where permitted

---

## UI-REPAIR-003 — ASSIGNED

Customer:
- Provider card visible
- Contact controls where policy permits
- Status timeline updated

Provider:
- Accept / Decline if not already accepted

Admin:
- Reassign where allowed

---

## UI-REPAIR-004 — INSPECTION_SCHEDULED

Customer:
- Date/time prominently displayed
- Contact provider

Provider:
- Start Inspection
- Reschedule according to policy

---

## UI-REPAIR-005 — INSPECTED / QUOTE_PENDING

Customer:
- Show inspection completed
- Waiting for quotation

Provider:
- Create/Edit draft quote

---

## UI-REPAIR-006 — QUOTE_SUBMITTED

Customer:
- Quotation card moves into action-required position
- Approve
- Reject

Provider:
- Read-only submitted quote
- Revision action only if allowed

Admin:
- View quote and history

---

## UI-REPAIR-007 — QUOTE_APPROVED

Customer:
- Show Approved
- Disable repeated approval

Provider:
- Start/schedule repair

---

## UI-REPAIR-008 — IN_PROGRESS

Customer:
- Show progress timeline
- Show latest provider update

Provider:
- Add progress
- Add part/labour
- Mark Waiting for Parts
- Mark Complete when eligible

---

## UI-REPAIR-009 — WAITING_FOR_PARTS

Customer:
- Show reason
- Show last update
- No misleading completion estimate unless provided

Provider:
- Add/update part information
- Resume Repair

---

## UI-REPAIR-010 — REPAIR_COMPLETED / CUSTOMER_CONFIRMATION

Customer:
- Completion summary first
- Confirm Completion primary
- Report Problem secondary but visible

Provider:
- Completion is read-only except approved correction workflow

Admin:
- View completion details

---

## UI-REPAIR-011 — DISPUTED

Customer:
- Complaint/dispute status
- Upload requested evidence where allowed

Provider:
- Respond where requested

Admin:
- Action-required queue

---

## UI-REPAIR-012 — FINALIZED

Customer:
- Review CTA if eligible
- Warranty CTA if active
- History remains available

Provider:
- Read-only historical job

Admin:
- Read-only normal operation; privileged correction separate

---

# 6.3 Quotation Interaction Rules

## UI-QUO-001 — Draft Quote
Provider can edit all permitted fields.

## UI-QUO-002 — Submitted Quote
Provider cannot silently overwrite. Customer can view current version.

## UI-QUO-003 — Viewed Quote
Optional viewed indicator; no change to amount/version.

## UI-QUO-004 — Approved Quote
Approve/reject controls disappear. Approval timestamp and version remain visible.

## UI-QUO-005 — Rejected Quote
Display rejection state/reason where applicable. Provider may create revision if allowed.

## UI-QUO-006 — Expired Quote
Approve button disabled/hidden. Show expired message and re-quote path.

## UI-QUO-007 — Revised Quote
Previous version accessible read-only. Current version clearly labeled.

---

# 6.4 Provider Eligibility Interaction Rules

## UI-ELIG-001 — Approved + Subscription Active + Verified
Show marketplace active status.

## UI-ELIG-002 — Payment Successful but Pending Approval
Show:
- Payment confirmed
- Application pending approval
- Not yet marketplace active

## UI-ELIG-003 — Approved but Subscription Expired
Show:
- Provider account approved
- Subscription expired
- Renew to receive new requests

## UI-ELIG-004 — Suspended
Show:
- Marketplace access suspended
- New leads disabled
- Historical repairs remain accessible according to permissions

## UI-ELIG-005 — Verification Information Required
Show exact requirement and resubmission action.

---

# 6.5 Permission Interaction Rules

## Customer
Can only see/edit own protected data.

### Hide
- provider internal controls
- admin controls
- other customer records

### Disable vs Hide
Prefer hide for actions a customer can never perform. Use disabled only when the action is normally theirs but temporarily unavailable because of lifecycle state.

---

## Provider
Can only act on assigned/authorized repairs and their own provider data.

### Hide
- admin approval controls
- audit log
- other provider private data

### Read-only
Historical quotes, completed jobs, submitted verification results as appropriate.

---

## Admin
Only show privileged actions based on granular permission.

Examples:
- `provider.approve`
- `provider.suspend`
- `repair.assign`
- `repair.correct_state`
- `complaint.resolve`
- `subscription.manage`
- `audit.view`

---

# 6.6 Mobile Behavior

## Customer Mobile
- One-column layouts
- Sticky bottom primary action where useful
- Bottom navigation
- Large tap targets
- Camera-first upload option
- Avoid horizontal tables

## Provider Mobile
- Dashboard summary cards
- Repair actions prioritized
- Bottom or compact navigation
- Fast access to contact, inspection, quote, progress

## Admin Mobile
- Essential queue and detail access only
- Complex reports/tables may require responsive cards or desktop recommendation

---

# 6.7 Desktop Behavior

## Customer Desktop
- Wider content area
- Two-column detail where useful
- Timeline and action panel may sit side-by-side

## Provider Desktop
- Sidebar navigation
- Job detail split into content + action/status rail

## Admin Desktop
- Persistent sidebar
- Filterable tables
- Bulk navigation
- Detail drawer or dedicated detail page
- Multi-column dashboards

---

# 7. Screen-to-Use-Case Traceability Examples

## Customer Creates Repair Request

`L1-CUS-01`
→ `SCR-REQ-001`
→ `CMP-FRM-003 Location Selector`
→ `CMP-FRM-004 Exact Service Selector`
→ `CMP-FRM-002 File Upload`
→ `UC-REQ-001/002/003/004/005`

---

## Customer Approves Quotation

`L1-CUS-01`
→ `SCR-CUS-006 Quotation Detail`
→ `CMP-QUO-001/002/003`
→ `CMP-MDL-001 Confirmation`
→ `UI-QUO-002 Submitted`
→ `UC-QUO-004`

---

## Provider Completes Repair

`L1-PRV-02`
→ `SCR-PRV-018 Complete Repair`
→ `CMP-FRM-002 File Upload`
→ `CMP-MDL-001 Confirmation`
→ `UC-JOB-008`

---

## Admin Suspends Provider

`L1-ADM-01`
→ `SCR-ADM-004 Provider Detail`
→ `CMP-MDL-001 Confirmation + Reason`
→ `UC-ADM-PRV-003`

---

# 8. Screen Data Requirement Summary

The following UI data needs must be reflected later in database/API design.

## Customer Screens Need
- user/customer profile
- locations
- service catalogue
- provider public profile
- provider rating/reviews
- repair request
- assignment
- provider contact-safe data
- inspection schedule
- quotation/version
- job status/history
- progress events
- parts/labour summary
- warranty
- complaint/dispute
- notifications

## Provider Screens Need
- provider profile
- verification
- services
- service areas
- pricing
- availability
- subscription
- payment status
- eligibility explanation
- leads/assignments
- customer-safe request data
- inspections
- quotations/versions
- jobs
- progress
- parts/labour
- warranty
- complaint responses
- reviews

## Admin Screens Need
- full operational repair data
- provider verification/approval
- subscription/payment state
- complaints
- warranty claims
- master data
- status histories
- audit events
- reporting aggregates

---

# 9. UI Validation Requirements

## Forms
- Required-field validation
- Min/max lengths
- Numeric ranges
- Date constraints
- Duplicate prevention where relevant
- Upload type/size/count validation

## Server Validation Feedback
UI must translate server errors into actionable messages without exposing sensitive internals.

Examples:
- `Quote expired. Ask the provider for a new quotation.`
- `This repair is no longer available for cancellation.`
- `This provider is currently unavailable for new requests.`

---

# 10. UI Notification Requirements

## In-App Notification Center
Recommended sections:
- Unread
- All

### Notification Item
- event title
- related repair/provider/payment context
- timestamp
- read/unread
- deep link

### Important Deep Links
- quote received → quotation detail
- repair complete → completion confirmation
- complaint update → complaint detail
- verification info required → verification screen
- subscription expiry → subscription screen

---

# 11. UI Security Requirements

- Never put authorization logic only in the frontend.
- Do not render sensitive data before authorization resolves.
- Private files require secured access URLs.
- Admin screens require verified privileged session.
- MFA required for production admin access.
- Confirmation required for critical admin mutations.
- Do not expose raw internal IDs unnecessarily in public UI.
- Log out clears protected client state.

---

# 12. UI Approval Checklist

## Level 1 — Journeys
- [ ] Customer repair journey approved
- [ ] Direct provider request journey approved
- [ ] Post-repair complaint/warranty journey approved
- [ ] Provider onboarding journey approved
- [ ] Provider repair journey approved
- [ ] Provider eligibility journey approved
- [ ] Admin operations journey approved

## Level 2 — Screens
- [ ] Public/auth screens approved
- [ ] Customer discovery screens approved
- [ ] Customer repair request screens approved
- [ ] Customer repair tracking screens approved
- [ ] Customer warranty/complaint/review screens approved
- [ ] Provider onboarding screens approved
- [ ] Provider operational screens approved
- [ ] Admin screens approved

## Level 3 — Components
- [ ] Navigation approved
- [ ] Status/timeline approved
- [ ] Cards approved
- [ ] Forms approved
- [ ] Uploads approved
- [ ] Quote components approved
- [ ] Admin tables approved
- [ ] Confirmation modals approved
- [ ] Empty/error/success messaging approved

## Level 4 — Interaction States
- [ ] Loading states approved
- [ ] Empty states approved
- [ ] Error states approved
- [ ] Success states approved
- [ ] Disabled states approved
- [ ] Permission states approved
- [ ] Session-expired behavior approved
- [ ] Repair status-dependent actions approved
- [ ] Quote state-dependent actions approved
- [ ] Provider eligibility states approved
- [ ] Mobile behavior approved
- [ ] Desktop behavior approved

---

# 13. Open UI Decisions to Freeze

## UI-OD-001 — Direct Provider Request
Should a request started from a provider profile be exclusive to that provider for a configured period before broadening to marketplace matching?

**Recommended:** Yes.

## UI-OD-002 — Customer-Provider Messaging
Decide whether MVP includes in-app chat or only approved external contact actions.

**Recommended for MVP:** use controlled contact actions first unless messaging is required operationally.

## UI-OD-003 — Customer Payment for Repair
Provider subscription payments are already in scope. Decide separately whether customer repair payments need UI in MVP.

**Recommended:** keep customer repair payment outside MVP unless business model requires platform settlement.

## UI-OD-004 — Admin Mobile Scope
Decide whether full admin mutation capability is required on mobile.

**Recommended:** essential operations only on mobile; full admin optimized for desktop/tablet.

## UI-OD-005 — Auto-Finalization Countdown
If jobs auto-finalize after provider completion, decide whether customer UI shows a countdown/deadline.

**Recommended:** yes, if auto-finalization is enabled.

---

# 14. Development Gate

This Step 4 UI specification should be approved before the final functional freeze and before database/API design is treated as final.

Recommended sequence after approval:

1. **Step 5 — Functional Specification Freeze**
   - use cases
   - screens
   - fields
   - business rules
   - permissions
   - states
   - data effects
   - notifications
   - audit requirements

2. **Step 6 — Database Schema & Data Dictionary**
3. **Step 7 — API Contracts**
4. **Step 8 — Roles & Permission Matrix**
5. **Step 9 — Formal State Transition Matrices**
6. **Step 10 — Test Cases & Acceptance Criteria**
7. **Development**

The coding team should be able to trace every major UI action back to an approved use case and business rule before implementation.
