# iFixIt — System Requirements & Use Cases

## 1. System Purpose

iFixIt is a repair-service platform that allows customers to submit repair requests, technicians or service providers to inspect and repair items, and administrators to control the full repair workflow.

The system supports the complete lifecycle:

**Request → Assignment → Inspection → Quotation → Approval → Repair → Completion → Review → Warranty / Closure**

---

## 2. User Roles

### Customer

Customers can:

- Register and log in
- Maintain basic profile and contact information
- Create repair requests
- Upload photos and supporting media
- Track repair status
- View assigned technician
- View inspection schedules
- View quotations
- Approve or reject quotations
- Contact the technician
- Confirm repair completion
- Submit reviews
- Submit complaints or disputes
- View repair history
- View active warranties
- Submit warranty claims

### Technician / Service Provider

Technicians can:

- Register and log in
- Maintain a technician profile
- Complete verification
- Select supported repair services
- Define service locations
- Set availability
- Receive assigned jobs
- Accept or decline jobs
- Contact customers
- Schedule inspections
- Record inspection results and diagnosis
- Create quotations
- Record labour and parts
- Update repair progress
- Upload repair photos
- Mark jobs complete
- Record warranty information
- Respond to complaints
- View customer reviews

### Administrator

Administrators can:

- Manage customers
- Manage technicians
- Verify, approve, suspend, and reactivate technicians
- Manage service categories and repair services
- Manage locations
- View and manage repair requests
- Assign and reassign technicians
- View quotations
- View and administratively manage jobs
- Manage complaints and disputes
- Moderate reviews
- Manage warranty claims
- View payments where enabled
- View reports
- View audit logs
- Configure system settings

---

## 3. Functional Requirements

### FR-001 — User Authentication

The system shall allow customers, technicians, and administrators to authenticate securely.

Requirements:

- Login
- Logout
- Session management
- Passwordless OTP or another approved authentication method
- Role-based access
- Account suspension controls
- Session expiration
- Administrator MFA before production

### FR-002 — Customer Profile

The system shall allow a customer to maintain:

- Full name
- Phone number
- Email
- Default address/location
- Notification preferences

### FR-003 — Technician Profile

The system shall maintain:

- Technician name
- Profile image
- Phone
- WhatsApp
- Email
- Technician type
- Business name if applicable
- Years of experience
- Supported services
- Service areas
- Qualifications
- Verification status
- Availability
- Rating
- Account status

---

## 4. Repair Service Catalogue

The system shall support the hierarchy:

**Category → Subcategory → Repair Service**

Example:

```text
Air Conditioning
    ↓
Repair
    ↓
AC Not Cooling
AC Water Leak
AC Compressor Repair
AC PCB Repair
```

Administrators shall be able to:

- Add a category
- Add a subcategory
- Add a repair service
- Edit catalogue records
- Enable catalogue records
- Disable catalogue records
- Archive catalogue records

Adding a normal repair service should be data-driven and should not require application code changes.

---

## 5. Repair Request Requirements

### FR-005 — Create Repair Request

A customer shall be able to submit:

- Repair category
- Specific repair service
- Item/equipment type
- Brand
- Model
- Serial number, optional
- Problem description
- Location
- Address
- Urgency
- Preferred date
- Preferred time
- Photos
- Video, optional
- Access instructions
- Contact information

The system shall generate a unique repair reference, for example:

```text
IFX-2026-000125
```

---

## 6. Repair Request Status

Recommended request states:

```text
DRAFT
SUBMITTED
AWAITING_ASSIGNMENT
TECHNICIAN_ASSIGNED
ACCEPTED
CANCELLED
EXPIRED
```

The system must maintain a historical record of status changes.

---

## 7. Technician Assignment

The system shall support both automatic and manual assignment.

### Automatic Assignment

Matching should require:

```text
Technician Active
AND Technician Approved
AND Exact Service Match
AND Location Match
AND Availability
AND Not Suspended
```

### Manual Assignment

An authorized administrator can manually assign or reassign an eligible technician.

All manual assignment changes shall be auditable.

---

## 8. Technician Job Acceptance

A technician can:

- Accept a job
- Decline a job

If accepted:

```text
Repair Request
      ↓
Assigned Technician
      ↓
Job Created
```

If declined:

- A reason may be recorded
- The assignment returns to matching or an administrator queue according to policy

---

## 9. Inspection Management

A technician shall be able to:

- Schedule an inspection
- Record inspection date/time
- Record diagnosis
- Add technician notes
- Upload inspection photos
- Identify required parts
- Estimate labour
- Create a quotation

Recommended inspection statuses:

```text
NOT_SCHEDULED
SCHEDULED
IN_PROGRESS
COMPLETED
```

---

## 10. Quotation Requirements

A technician shall be able to create a quotation containing:

- Labour items
- Labour charges
- Parts
- Quantity
- Unit cost
- Additional fees
- Discounts
- Tax if applicable
- Total
- Estimated repair duration
- Quote expiry date
- Notes

Example:

```text
AC Capacitor                   MVR 250
Labour                         MVR 350
-------------------------------------
Total                          MVR 600
```

---

## 11. Quotation Status

Recommended quotation states:

```text
DRAFT
SUBMITTED
VIEWED
APPROVED
REJECTED
EXPIRED
CANCELLED
```

The customer shall be able to:

- View a quotation
- Approve a quotation
- Reject a quotation

Repair should normally not begin before customer approval unless a specific business rule allows otherwise.

---

## 12. Repair Job Lifecycle

Recommended job states:

```text
ASSIGNED
ACCEPTED
INSPECTION_SCHEDULED
INSPECTED
QUOTE_PENDING
QUOTE_APPROVED
REPAIR_SCHEDULED
IN_PROGRESS
WAITING_FOR_PARTS
ON_HOLD
REPAIR_COMPLETED
CUSTOMER_CONFIRMATION
DISPUTED
FINALIZED
CANCELLED
UNABLE_TO_REPAIR
```

Every transition shall be recorded in job history with timestamp and actor where applicable.

---

## 13. Parts Management

A technician shall be able to record:

- Part name
- Part number
- Brand
- Quantity
- Unit price
- Supplier/reference
- Installed date
- Warranty period

The initial version does not require full inventory management unless later approved.

---

## 14. Labour Management

A technician can record:

- Labour description
- Labour hours
- Rate
- Labour amount

Example:

```text
Diagnosis               MVR 100
Compressor replacement  MVR 600
```

---

## 15. Repair Progress Updates

Technicians shall be able to provide progress updates.

Example:

```text
10:00 Inspection started
10:30 Fault identified
11:15 Quote submitted
12:00 Quote approved
13:00 Repair started
15:30 Replacement completed
16:00 Testing completed
```

Customers shall see customer-safe progress updates.

---

## 16. Photo Evidence

The system shall support repair-related media throughout the lifecycle.

### Before Repair

- Customer issue photos
- Technician inspection photos

### During Repair

- Faulty components
- Removed parts
- Installation/work progress

### After Repair

- Completed repair
- Testing evidence
- Final condition

Internal/private media shall be separable from customer-visible media.

---

## 17. Repair Completion

The technician shall:

1. Mark work complete
2. Enter completion notes
3. Record final parts and labour
4. Upload final photos where required
5. Submit the job for customer confirmation

The customer can:

- Confirm completion
- Raise a dispute

---

## 18. Warranty

A completed repair may create a warranty.

Warranty data may include:

- Warranty type
- Start date
- End date
- Duration
- Covered repair/service
- Covered parts
- Terms
- Status

Recommended states:

```text
ACTIVE
EXPIRED
VOID
CLAIMED
```

---

## 19. Warranty Claim

A customer may submit a warranty claim against an eligible repair.

The system should verify:

```text
Original Job Completed
AND Warranty Active
AND Claim Within Warranty Terms
```

The technician and/or administrator can review the claim according to policy.

---

## 20. Reviews

A customer shall be able to review an eligible completed repair.

Ratings may include:

- Repair quality
- Punctuality
- Communication
- Professionalism
- Value for money

Only one verified review shall be allowed per eligible completed job unless an explicit revision process is defined.

---

## 21. Complaints & Disputes

Customers can report issues including:

- Technician no-show
- Work not completed
- Incorrect diagnosis
- Poor workmanship
- Problem returned
- Unexpected charges
- Item damaged
- Inappropriate behavior
- Other

Recommended complaint states:

```text
OPEN
UNDER_REVIEW
WAITING_FOR_CUSTOMER
WAITING_FOR_TECHNICIAN
RESOLVED
REJECTED
CLOSED
```

Complaint evidence shall remain private.

---

## 22. Notifications

Notifications should be generated for major events including:

- Request submitted
- Technician assigned
- Technician accepted
- Inspection scheduled
- Inspection completed
- Quote received
- Quote approved
- Quote rejected
- Repair started
- Waiting for parts
- Repair completed
- Customer confirmation required
- Complaint update
- Warranty activated
- Warranty claim update

Possible channels:

- In-app
- SMS
- Email
- WhatsApp where integrated

Notification failure must not corrupt or roll back the authoritative repair transaction.

---

## 23. Customer Dashboard Requirements

The customer dashboard should show:

- Open requests
- Assigned technician
- Scheduled inspections
- Quotations awaiting approval
- Repairs in progress
- Repairs waiting for parts
- Completed repairs
- Complaints
- Active warranties
- Repair history

---

## 24. Technician Dashboard Requirements

The technician dashboard should show:

- New assignments
- Jobs awaiting acceptance
- Today's inspections
- Quotes pending
- Approved repairs
- Jobs in progress
- Waiting for parts
- Completed jobs
- Customer disputes
- Ratings
- Availability

---

## 25. Admin Dashboard Requirements

The admin dashboard should show:

- New repair requests
- Unassigned requests
- Pending technician approvals
- Active technicians
- Jobs in progress
- Jobs waiting for parts
- Pending quotations
- Open complaints
- Warranty claims
- Completed jobs
- Revenue/payment indicators if enabled

---

## 26. Reporting Requirements

### Repairs

- Requests by day/month
- Repairs by category
- Repairs by service
- Repairs by location
- Completion rate
- Cancellation rate
- Average completion time

### Technicians

- Jobs assigned
- Acceptance rate
- Completion rate
- Average response time
- Rating
- Complaint count

### Quotations

- Quotes issued
- Quotes approved
- Quotes rejected
- Average quote amount

### Warranty

- Warranties issued
- Active warranties
- Warranty claims
- Repeat failure rate

---

## 27. Audit Requirements

Audit events shall include:

- Technician approved
- Technician suspended
- Job manually assigned
- Job reassigned
- Job status manually corrected
- Quote changed after submission
- Complaint resolved
- Warranty manually changed
- Payment manually corrected
- Admin permission changed

Audit records should capture:

```text
Actor
Action
Entity
Previous Value
New Value
Reason
Timestamp
```

Audit history should be append-oriented and protected from normal administrative deletion.

---

## 28. Non-Functional Requirements

### Performance

Recommended targets:

- Public page P75 LCP ≤ 2.5 seconds
- Standard API P95 ≤ 500 ms
- Repair search/assignment P95 ≤ 1 second
- Basic admin reports P95 ≤ 3 seconds

### Security

The system should provide:

- HTTPS/TLS
- Role-based authorization
- Server-side permission checks
- Private repair and verification files
- Secure uploads
- Administrator MFA
- Rate limiting
- Audit logging
- Secure session management
- Input validation
- OWASP-aligned protections
- Secure secret management

### Availability

Initial target:

**99.9% monthly internal availability target**

### Backup & Recovery

- Automated database backups
- Point-in-time recovery where supported
- Periodic restore testing
- Core RTO target ≤ 4 hours

---

# 29. Major Use Cases

## Customer Use Cases

| ID | Use Case |
|---|---|
| UC-C01 | Register / Login |
| UC-C02 | Update Profile |
| UC-C03 | Create Repair Request |
| UC-C04 | Upload Issue Photos |
| UC-C05 | Track Request |
| UC-C06 | View Assigned Technician |
| UC-C07 | View Inspection Schedule |
| UC-C08 | View Quotation |
| UC-C09 | Approve Quotation |
| UC-C10 | Reject Quotation |
| UC-C11 | Track Repair |
| UC-C12 | Confirm Repair |
| UC-C13 | Raise Dispute |
| UC-C14 | Leave Review |
| UC-C15 | View Warranty |
| UC-C16 | Submit Warranty Claim |
| UC-C17 | Create Complaint |
| UC-C18 | View Repair History |

## Technician Use Cases

| ID | Use Case |
|---|---|
| UC-T01 | Register / Login |
| UC-T02 | Create Technician Profile |
| UC-T03 | Complete Verification |
| UC-T04 | Select Services |
| UC-T05 | Select Service Areas |
| UC-T06 | Set Availability |
| UC-T07 | Receive Assignment |
| UC-T08 | Accept Job |
| UC-T09 | Decline Job |
| UC-T10 | Contact Customer |
| UC-T11 | Schedule Inspection |
| UC-T12 | Record Diagnosis |
| UC-T13 | Upload Inspection Photos |
| UC-T14 | Create Quotation |
| UC-T15 | Add Parts |
| UC-T16 | Add Labour |
| UC-T17 | Start Repair |
| UC-T18 | Update Progress |
| UC-T19 | Mark Waiting for Parts |
| UC-T20 | Resume Repair |
| UC-T21 | Mark Repair Complete |
| UC-T22 | Record Warranty |
| UC-T23 | Respond to Complaint |
| UC-T24 | View Reviews |

## Administrator Use Cases

| ID | Use Case |
|---|---|
| UC-A01 | Login With MFA |
| UC-A02 | View Dashboard |
| UC-A03 | Manage Customers |
| UC-A04 | Manage Technicians |
| UC-A05 | Verify Technician |
| UC-A06 | Approve Technician |
| UC-A07 | Suspend Technician |
| UC-A08 | Manage Service Catalogue |
| UC-A09 | Manage Locations |
| UC-A10 | View Repair Requests |
| UC-A11 | Assign Technician |
| UC-A12 | Reassign Technician |
| UC-A13 | View Quotations |
| UC-A14 | View Jobs |
| UC-A15 | Correct Job State |
| UC-A16 | Manage Complaints |
| UC-A17 | Manage Warranty Claims |
| UC-A18 | Moderate Reviews |
| UC-A19 | View Reports |
| UC-A20 | View Audit Logs |
| UC-A21 | Manage System Configuration |

---

# 30. Main iFixIt End-to-End Use Case

```text
Customer Logs In
        ↓
Creates Repair Request
        ↓
Uploads Item / Damage Photos
        ↓
Ticket Generated
        ↓
System/Admin Assigns Technician
        ↓
Technician Accepts
        ↓
Inspection Scheduled
        ↓
Technician Diagnoses Problem
        ↓
Quotation Prepared
        ↓
Customer Reviews Quote
        ↓
Customer Approves
        ↓
Repair Starts
        ↓
Parts + Labour Recorded
        ↓
Repair Progress Updated
        ↓
Repair Completed
        ↓
Customer Confirms
        ↓
Warranty Created
        ↓
Customer Review
        ↓
Job Finalized
```

---

## 31. Core Business Rules

1. Technicians may only receive jobs for services and locations they are authorized to support.
2. Suspended technicians cannot receive new jobs.
3. A customer may only access their own private repair records.
4. A technician may only access jobs assigned to them or their authorized business team.
5. Repair status changes must follow approved state transitions.
6. Critical state changes must be recorded historically rather than overwritten without trace.
7. Quotation totals must be calculated authoritatively on the server.
8. Customer approval should normally be required before repair work begins.
9. Completed jobs remain historically available after technician suspension or account changes.
10. Warranty claims must reference an eligible completed repair and active warranty.
11. Reviews must reference an eligible completed job.
12. Complaint records and evidence are private.
13. Administrative overrides require the appropriate permission and should be audited.
14. Public and private data must remain clearly separated.
15. Normal new repair services should be configurable through the service catalogue without application-code changes.

---

## 32. Recommended Development Principle

The frontend must not be authoritative for protected business rules. The server/API layer must validate:

- Authentication
- Authorization
- Technician eligibility
- Job ownership
- State transitions
- Quotation integrity
- Warranty eligibility
- Review eligibility
- Complaint permissions
- Administrative permissions

The relational database should remain the system of record for repair workflow state and historical records.