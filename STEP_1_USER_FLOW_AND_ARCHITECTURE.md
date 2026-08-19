# iFixIt — Step 1: User Flow & System Architecture

## 1. Purpose

This document defines how users move through the iFixIt repair-service platform before implementation begins. It covers the Customer Journey, Provider/Technician Journey, Admin Journey, and the high-level system architecture that supports those flows.

The goal is to ensure the user experience and backend responsibilities are clear before coding starts.

---

# 2. User Roles

iFixIt supports three core roles:

- **Customer** — submits repair requests and tracks repair progress.
- **Technician / Service Provider** — accepts assigned work, performs inspections, creates quotations, updates jobs, and completes repairs.
- **Administrator** — controls technicians, service categories, assignments, complaints, subscriptions, reports, and system configuration.

---

# 3. Customer Journey

## 3.1 Landing on the Platform

The customer arrives at the iFixIt home page.

The page should immediately allow the customer to:

- Select their island or service location.
- Search for a service.
- Browse repair categories.
- View available technicians/providers.
- Start a repair request.
- Log in or register.

### Flow

```text
Customer Opens iFixIt
        ↓
Home Page
        ↓
Select Island / Location
        ↓
Select Repair Category / Service
        ↓
Search Providers
```

---

## 3.2 Selecting Location

The customer chooses the location where the repair service is required.

Example locations:

- Malé
- Hulhumalé
- Vilimalé
- Fuvahmulah
- Addu City
- Other enabled Maldives islands

Only marketplace-enabled locations should be selectable for new repair requests.

### Flow

```text
Choose Location
      ↓
System Checks Location Status
      ↓
Location Enabled?
   ┌──┴──┐
  Yes    No
   ↓      ↓
Continue  Show Not Available
```

---

## 3.3 Selecting a Repair Service

The service structure should be:

```text
Category
   ↓
Subcategory
   ↓
Specific Repair Service
```

Example:

```text
Air Conditioning
      ↓
Repair
      ↓
AC Not Cooling
```

Another example:

```text
Appliances
    ↓
Washing Machine
    ↓
Not Draining
```

The exact service selected should be used for technician matching.

---

## 3.4 Searching and Filtering Providers

The customer can search for technicians based on:

- Exact repair service
- Island/location
- Availability
- Technician rating
- Verification status
- Provider type
- Experience
- Pricing type

### Provider Eligibility Rule

A technician should only appear if:

```text
Technician Approved
AND
Account Active
AND
Valid Subscription
AND
Not Suspended
AND
Exact Service Match
AND
Location Match
```

Optional filters must never bypass these eligibility rules.

### Search Flow

```text
Customer Search
      ↓
Exact Service
      ↓
Location
      ↓
Eligibility Engine
      ↓
Eligible Technicians
      ↓
Apply Filters
      ↓
Rank Results
      ↓
Display Providers
```

---

## 3.5 Viewing a Technician / Provider Profile

A customer can view:

- Technician name
- Profile photo / business logo
- Services
- Service areas
- Availability
- Pricing summary
- Rating
- Review count
- Verification badges
- Work gallery
- Public contact methods

Private information must never be exposed publicly.

Private data includes:

- Identity documents
- Admin notes
- Private phone number
- Payment details
- Complaint records
- Internal verification data

---

## 3.6 Creating a Repair Request

The customer starts a repair request.

### Required Information

- Specific repair service
- Location
- Problem description
- Urgency

### Optional / Conditional Information

- Item/equipment type
- Brand
- Model
- Serial number
- Preferred date
- Preferred time
- Address
- Access instructions
- Photos
- Video
- Budget

### Example

```text
Service: AC Not Cooling
Location: Hulhumalé
Brand: Panasonic
Model: CS-XPU12
Problem: AC runs but does not cool
Urgency: Today
Photos: 2
```

The system creates a unique repair request ID.

Example:

```text
IFX-2026-000125
```

---

## 3.7 Repair Request Matching

After submission:

```text
Repair Request
      ↓
Stored in Database
      ↓
Matching Engine
      ↓
Eligible Technicians
      ↓
Lead / Assignment Created
      ↓
Technician Notified
```

Recommended assignment model:

- Automatic matching first.
- Admin override/reassignment available.

---

## 3.8 Technician Assignment

The system can assign technicians automatically based on:

- Exact service
- Location
- Approval status
- Subscription status
- Suspension status
- Availability
- Accepting jobs setting

If automatic assignment fails, the request should enter the admin assignment queue.

---

## 3.9 Customer Tracks Repair Progress

The customer should see a clear timeline.

Recommended lifecycle:

```text
Request Submitted
      ↓
Technician Assigned
      ↓
Technician Accepted
      ↓
Inspection Scheduled
      ↓
Inspection Completed
      ↓
Quotation Submitted
      ↓
Quotation Approved
      ↓
Repair In Progress
      ↓
Waiting for Parts (optional)
      ↓
Repair Completed
      ↓
Customer Confirmation
      ↓
Finalized
```

Alternative states:

- Quote Rejected
- Cancelled
- Unable to Repair
- On Hold
- Disputed

---

## 3.10 Quotation Approval

After inspection, the technician submits a quote.

Customer sees:

- Labour
- Parts
- Quantity
- Unit price
- Additional charges
- Discounts
- Total price
- Estimated repair time
- Quote expiry
- Technician notes

Customer actions:

- **Approve Quote**
- **Reject Quote**

Repair normally should not start before quotation approval.

---

## 3.11 Completion

When repair is finished:

```text
Technician Marks Completed
      ↓
Customer Receives Notification
      ↓
Customer Reviews Result
      ↓
Confirm Completion
   OR
Raise Dispute
```

After confirmation, the job becomes finalized.

---

## 3.12 Review and Warranty

After finalization, the customer may:

- Leave a review
- Rate technician quality
- Rate punctuality
- Rate communication
- Rate professionalism
- Rate value for money
- View warranty
- Raise eligible warranty claim

---

# 4. Technician / Provider Journey

## 4.1 Technician Registration

```text
Technician Registers
      ↓
Phone Verification
      ↓
Profile Setup
      ↓
Identity / Business Verification
      ↓
Select Services
      ↓
Select Service Areas
      ↓
Set Pricing
      ↓
Set Availability
      ↓
Select Subscription Plan
      ↓
Payment
      ↓
Submit Application
      ↓
Admin Review
      ↓
Approved
```

Payment alone must not make the technician active in the marketplace.

---

## 4.2 Provider Dashboard

The technician dashboard should show:

- Approval status
- Verification status
- Subscription status
- Subscription expiry
- Marketplace eligibility
- Availability
- New assignments/leads
- Today's inspections
- Active jobs
- Quotes awaiting customer response
- Jobs waiting for parts
- Completed jobs
- Rating
- Alerts

---

## 4.3 Managing Incoming Requests

The technician receives jobs only when eligible.

Technician can:

- View incoming request
- View problem description
- View customer-uploaded photos
- View service location
- View urgency
- View schedule preference
- Accept
- Decline

### Flow

```text
New Assignment
      ↓
Technician Opens Request
      ↓
Accept / Decline
   ┌──┴──┐
 Accept Decline
   ↓       ↓
Create Job Return to Matching/Admin Queue
```

Eligibility should be rechecked when Accept is pressed.

---

## 4.4 Contacting the Customer

After acceptance, technician may:

- Call customer
- WhatsApp customer
- Schedule inspection
- Add appointment notes

Only permitted customer contact information should be exposed.

---

## 4.5 Inspection

Technician can:

- Start inspection
- Record diagnosis
- Add notes
- Upload inspection photos
- Add required parts
- Estimate labour
- Prepare quotation

Inspection states:

```text
NOT_SCHEDULED
SCHEDULED
IN_PROGRESS
COMPLETED
```

---

## 4.6 Creating a Quotation

Technician can add:

- Labour item
- Labour cost
- Part
- Part number
- Quantity
- Unit price
- Other charges
- Discount
- Tax if enabled
- Total
- Estimated completion time
- Quote expiry
- Notes

### Flow

```text
Inspection Completed
      ↓
Create Quote
      ↓
Submit Quote
      ↓
Customer Reviews
   ┌──┴──┐
Approve Reject
   ↓      ↓
Repair   Quote Closed / Revision Flow
```

---

## 4.7 Repair Execution

Technician updates job status during work.

```text
QUOTE_APPROVED
      ↓
REPAIR_SCHEDULED
      ↓
IN_PROGRESS
      ↓
WAITING_FOR_PARTS (optional)
      ↓
IN_PROGRESS
      ↓
REPAIR_COMPLETED
```

Technician may record:

- Work performed
- Parts installed
- Labour
- Progress notes
- Before/during/after photos
- Testing result
- Completion notes

---

## 4.8 Marking Repair Complete

Technician:

1. Confirms repair work completed.
2. Records final notes.
3. Records final parts and labour.
4. Uploads completion evidence if required.
5. Marks repair completed.
6. System asks customer to confirm.

---

## 4.9 Subscription Management

Technician can:

- View plan
- View subscription status
- View start date
- View expiry date
- View grace period
- View payment history
- Renew subscription
- Change plan if enabled

Recommended states:

```text
TRIAL
PENDING_PAYMENT
ACTIVE
RENEWAL_DUE
GRACE_PERIOD
EXPIRED
CANCELLED
SUSPENDED
```

### Critical Rule

```text
Approved + Expired Subscription
= No New Marketplace Visibility
```

Existing job history should remain accessible.

---

# 5. Admin Journey

## 5.1 Admin Dashboard

Admin dashboard should show:

- New repair requests
- Unassigned requests
- Technician applications
- Pending verification
- Active technicians
- Suspended technicians
- Active subscriptions
- Expiring subscriptions
- Payment issues
- Active jobs
- Waiting-for-parts jobs
- Open complaints
- Warranty claims
- Reviews requiring moderation

---

## 5.2 Technician Management

Admin can:

- View technician profile
- Review verification documents
- Approve technician
- Reject technician
- Request additional information
- Suspend technician
- Reactivate technician
- View technician services
- View service areas
- View subscription
- View payments
- View jobs
- View reviews
- View complaints

All sensitive actions must be permission-controlled and audited.

---

## 5.3 Managing Repair Requests

Admin can:

- View all repair requests
- View unassigned requests
- Inspect matching results
- Manually assign technician
- Reassign technician
- View request status history
- Investigate failed assignments

Manual assignment must still respect safety/eligibility rules unless a specifically authorized override exists.

---

## 5.4 Job Management

Admin can:

- View all jobs
- Filter by state
- View customer/technician timeline
- View inspection data
- View quotation
- View parts/labour
- View complaints
- Resolve disputes
- Correct status only with elevated permission

Every manual status correction requires:

- Permission
- Reason
- Audit log

---

## 5.5 Subscription Management

Admin can:

- Create/edit plans
- View provider subscriptions
- View expiring accounts
- Extend subscription manually
- Suspend entitlement
- Correct subscription state
- View subscription history

Manual overrides must be audited.

---

## 5.6 Payment Management

Admin can:

- View payment records
- View pending payments
- View failed payments
- View gateway transaction references
- Reconcile uncertain transactions
- Review refunds/reversals

Admin must not casually mark a payment paid.

Any manual payment correction requires elevated permission and an audit reason.

---

## 5.7 Service & Location Management

Admin manages data-driven master records.

### Services

```text
Category
   ↓
Subcategory
   ↓
Specific Service
```

Admin can:

- Add
- Edit
- Enable
- Disable
- Archive

This allows new standard repair services to be added without changing application code.

### Locations

Admin can:

- Add island/location
- Edit location
- Enable marketplace
- Disable marketplace
- Archive

Historical jobs must retain location references.

---

# 6. High-Level System Architecture

```text
                    ┌──────────────────────────────┐
                    │          USERS               │
                    │                              │
                    │ Customer                     │
                    │ Technician / Provider        │
                    │ Admin                        │
                    └──────────────┬───────────────┘
                                   │
                              HTTPS / TLS
                                   │
                    ┌──────────────▼───────────────┐
                    │        WEB APPLICATION       │
                    │                              │
                    │ Public Marketplace           │
                    │ Customer Portal              │
                    │ Provider Portal              │
                    │ Admin Portal                 │
                    └──────────────┬───────────────┘
                                   │
                              REST / JSON
                                   │
                ┌──────────────────▼──────────────────┐
                │       APPLICATION / API LAYER       │
                │       Modular Monolith Backend      │
                │                                     │
                │ Authentication                      │
                │ Customers                           │
                │ Providers                           │
                │ Verification                        │
                │ Services                            │
                │ Locations                           │
                │ Search / Matching                   │
                │ Repair Requests                     │
                │ Assignments / Leads                 │
                │ Inspections                         │
                │ Quotations                          │
                │ Jobs                                │
                │ Parts / Labour                      │
                │ Reviews                             │
                │ Complaints                          │
                │ Warranties                          │
                │ Subscriptions                       │
                │ Payments                            │
                │ Notifications                       │
                │ Admin                               │
                │ Reporting                           │
                │ Audit                               │
                └────────────┬─────────────┬──────────┘
                             │             │
             ┌───────────────▼───┐    ┌────▼───────────────────┐
             │ RELATIONAL DB     │    │ OBJECT STORAGE         │
             │ PostgreSQL        │    │                        │
             │                   │    │ Profile images         │
             │ Users             │    │ Verification docs      │
             │ Providers         │    │ Repair photos          │
             │ Services          │    │ Inspection photos      │
             │ Locations         │    │ Complaint evidence     │
             │ Requests          │    │ Completion photos      │
             │ Jobs              │    └────────────────────────┘
             │ Quotes            │
             │ Subscriptions     │
             │ Payments          │
             │ Reviews           │
             │ Complaints        │
             │ Warranties        │
             │ Audit             │
             └─────────┬─────────┘
                       │
          ┌────────────┴──────────────────────────────┐
          │                                           │
 ┌────────▼───────────┐                     ┌─────────▼──────────┐
 │ BACKGROUND JOBS    │                     │ EXTERNAL SERVICES │
 │                    │                     │                    │
 │ Notifications      │                     │ OTP / SMS          │
 │ Retries            │                     │ Payment Gateway    │
 │ Subscription Expiry│                     │ Email              │
 │ Reconciliation     │                     │ WhatsApp           │
 │ Analytics          │                     │ Monitoring         │
 └────────────────────┘                     └────────────────────┘
```

---

# 7. Core Data Flow

## 7.1 Customer Request to Job

```text
Customer
   ↓
Create Repair Request
   ↓
Database
   ↓
Matching Engine
   ↓
Eligible Technician
   ↓
Assignment / Lead
   ↓
Technician Accepts
   ↓
Job Created
   ↓
Inspection
   ↓
Quotation
   ↓
Customer Approval
   ↓
Repair
   ↓
Completion
   ↓
Customer Confirmation
   ↓
Review / Warranty
```

---

## 7.2 Payment Data Flow

```text
Provider Selects Plan
      ↓
Backend Creates Payment
      ↓
Payment Gateway
      ↓
Provider Pays
      ↓
Browser Returns
      ↓
Show "Confirming Payment"
      ↓
Signed Gateway Webhook
      ↓
Validate Signature
      ↓
Check Transaction Idempotency
      ↓
Payment = SUCCEEDED
      ↓
Subscription = ACTIVE
      ↓
Provider Eligibility Recalculated
```

The browser return must never be the authoritative payment confirmation.

---

## 7.3 Verification Data Flow

```text
Provider Uploads Verification Document
      ↓
Private Object Storage
      ↓
Metadata in Database
      ↓
Admin Verification Queue
      ↓
Admin Reviews
   ┌──┼───────────────┐
Approve  Request Info  Reject
   ↓          ↓          ↓
Verified   Resubmit    Rejected
```

---

## 7.4 Notification Data Flow

```text
Business Transaction
      ↓
Database Commit
      ↓
Notification Event
      ↓
Background Queue
      ↓
SMS / Email / In-App / WhatsApp
```

Notification failure should not roll back a successfully completed repair/job transaction.

---

# 8. System Architecture Principles

1. **Mobile-first customer and technician experience.**
2. **Admin is desktop-first but responsive.**
3. **Backend is authoritative for business rules.**
4. **UI must never directly control protected states.**
5. **PostgreSQL-compatible relational database is the system of record.**
6. **Private files are stored separately from public files.**
7. **Critical state changes are audited.**
8. **Payment processing is webhook-authoritative and idempotent.**
9. **Technician eligibility is calculated centrally.**
10. **New services and locations are data-driven.**
11. **Historical repair/job/payment data is preserved.**
12. **External providers are integrated behind adapters where practical.**
13. **Background processing handles notifications, retries, expiry and reconciliation.**
14. **Development, staging and production environments must be isolated.**

---

# 9. Canonical Technician Eligibility

```text
Marketplace Eligible
=
Technician Approved
AND
Account Active
AND
Qualifying Subscription
AND
Not Suspended
```

For a particular repair request:

```text
Assignment Eligible
=
Marketplace Eligible
AND
Exact Service Match
AND
Location Match
AND
Accepting Jobs
```

Availability may affect ranking or dispatch, but it must never override suspension, approval, or subscription rules.

---

# 10. Recommended Main Repair Lifecycle

```text
DRAFT
  ↓
SUBMITTED
  ↓
AWAITING_ASSIGNMENT
  ↓
TECHNICIAN_ASSIGNED
  ↓
ACCEPTED
  ↓
INSPECTION_SCHEDULED
  ↓
INSPECTED
  ↓
QUOTE_PENDING
  ↓
QUOTE_APPROVED
  ↓
REPAIR_SCHEDULED
  ↓
IN_PROGRESS
  ↓
WAITING_FOR_PARTS   ← optional
  ↓
IN_PROGRESS
  ↓
REPAIR_COMPLETED
  ↓
CUSTOMER_CONFIRMATION
  ↓
FINALIZED
```

Alternative states:

```text
QUOTE_REJECTED
ON_HOLD
DISPUTED
CANCELLED
UNABLE_TO_REPAIR
```

Every status transition must be stored in history.

---

# 11. Recommended Navigation

## Customer

```text
Home
Search
Requests
Jobs
Account
```

## Technician

```text
Dashboard
Assignments
Jobs
Availability
Profile
Subscription
```

## Admin

```text
Dashboard
Customers
Technicians
Verification
Requests
Assignments
Jobs
Services
Locations
Quotations
Subscriptions
Payments
Reviews
Complaints
Warranties
Reports
Audit Logs
Configuration
```

---

# 12. Step 1 Completion Criteria

Step 1 can be considered complete when the following are approved:

- [ ] Customer journey
- [ ] Technician journey
- [ ] Admin journey
- [ ] Location-selection flow
- [ ] Service-selection flow
- [ ] Search/matching flow
- [ ] Repair request flow
- [ ] Assignment model
- [ ] Inspection flow
- [ ] Quotation flow
- [ ] Repair lifecycle
- [ ] Completion/dispute flow
- [ ] Review flow
- [ ] Warranty flow
- [ ] Provider subscription flow
- [ ] Payment flow
- [ ] Verification flow
- [ ] Notification flow
- [ ] System architecture
- [ ] Technician eligibility rule
- [ ] Main navigation model

Once these are approved, the project can move to the next design step: detailed screens, data schema, APIs, permissions, and implementation planning.
