# iFixIt — Provider Company Operations & Flexible Staffing Draft Baseline

**Status:** Approved drafting baseline  
**Date:** 2026-08-20  
**Scope:** Company personnel, job contacts, operational shifts, job staff assignments, and future handover design patterns.

---

## 1. Approved Architectural Direction

The following principles are approved for continued design work:

```text
Provider Company
├── Company Contacts
├── Company Personnel
├── Company Shift Templates
└── Service Request / Job
    ├── Job Company Contact Assignments
    ├── Job Operational Shifts
    └── Job Staff Assignments
```

Freelancers remain separate marketplace providers and must not be treated as company personnel.

---

## 2. Company Personnel Are Distinct From Freelancers

A freelancer is an independent provider in the marketplace.

A technician, helper, supervisor, dispatcher, manager, or other worker operating under a provider company is company personnel.

The system must therefore avoid using `IndividualProvider` records for company employees merely because they perform field work.

Conceptual structure:

```text
company_personnel

personnel_id
provider_company_id
full_name
phone
email
role
is_field_worker
employment_status
is_active
created_at
updated_at
```

Detailed fields and personnel role values remain open for later finalization.

---

## 3. Company Contacts

Company contacts remain separate from personnel and may represent people responsible for communications, administration, operations, billing, dispatch, emergency coordination, or specific jobs.

The previously approved company contact model remains in force.

A service job may dynamically reference one or more existing company contacts without duplicating the company contact record into the job.

Conceptual assignment table:

```text
job_company_contacts

job_company_contact_id
service_request_id
company_contact_id
contact_purpose
is_primary_for_job
active_from
active_until
```

Detailed constraints remain open for later finalization.

---

## 4. Shift Design Pattern

The approved direction is to separate reusable company shift templates from actual operational shift instances on jobs.

### Company shift templates

Conceptual structure:

```text
company_shift_templates

shift_template_id
provider_company_id
name
start_time
end_time
is_active
```

These represent reusable patterns such as morning, evening, night, or custom company shifts.

### Job operational shifts

Conceptual structure:

```text
job_operational_shifts

job_shift_id
service_request_id
shift_template_id nullable
scheduled_start_at
scheduled_end_at
actual_start_at
actual_end_at
status
```

A short job may have one operational shift.

A long or multi-phase job may have many operational shifts.

Example:

```text
Service Request #1234
├── Morning operational block
└── Evening operational block
```

Detailed shift status values, approval rules, and scheduling constraints remain open for later finalization.

---

## 5. Historical Job Staff Assignments

The system must maintain staff assignments as historical records.

A changing technician must never be implemented by overwriting one current technician field.

Conceptual structure:

```text
job_staff_assignments

assignment_id
service_request_id
job_shift_id nullable
personnel_id
assignment_role
assigned_at
onsite_start_at
onsite_end_at
status
```

Example:

```text
08:10–15:55  Worker A — Primary Technician
15:50–16:05  Worker A + Worker B — handover overlap
16:05–21:20  Worker B — Primary Technician
```

The records preserve who actually worked on the job and when.

---

## 6. Staff Changes Must Not Create New Service Requests

A shift change, technician change, supervisor change, or handover must not create a new customer service request.

The customer continues to see the same service request / job.

Only the operational records beneath the job change.

```text
Same Service Request
    ↓
Shift 1
    ↓
Worker A
    ↓
Handover
    ↓
Shift 2
    ↓
Worker B
```

The following must remain unchanged unless the business process explicitly changes them:

- request identity
- customer ownership
- service location
- provider company
- provider service-area match
- core job history

---

## 7. Handover Direction

Detailed handover schema is intentionally not finalized yet.

For the drafting phase, the architecture must allow either:

1. a lightweight handover represented through assignment relationships and notes; or
2. a future dedicated `job_handovers` table for complex or multi-day jobs.

A future dedicated handover model may capture:

- outgoing personnel
- incoming personnel
- outgoing shift
- incoming shift
- handover start/end timestamps
- completed work
- remaining work
- technical notes
- customer notes
- materials status
- safety notes
- acknowledgment by incoming personnel

The current architecture must remain compatible with adding this module later without redesigning provider, location, or service-request tables.

---

## 8. Relationship With Customer On-Site Contacts

Customer on-site contacts and provider-company personnel are separate concepts.

```text
CUSTOMER SIDE
Service Request
└── 1..many Customer On-Site Contacts

PROVIDER SIDE
Provider Company
├── Company Contacts
├── Company Personnel
└── Job Staff Assignments
```

A customer on-site contact helps the provider access or coordinate the service location.

A company worker or technician performs or manages the service for the provider company.

These records must not be merged.

---

## 9. Relationship With Geographic Service Coverage

Provider geographic eligibility remains controlled at the provider-company level through the approved provider service-area architecture.

Company personnel do not independently redefine provider geographic coverage merely because they are assigned to a job.

```text
Provider Company
    ↓
Approved FixIt Service Areas
    ↓
Customer Request Matched
    ↓
Company Assigns Personnel / Shifts
```

A personnel change during an active job does not alter the location match.

---

## 10. Approved Principles to Carry Forward

The following principles are now approved for continued system design:

1. Company personnel are distinct from freelancers.
2. Company contacts can be dynamically linked to jobs.
3. Reusable company shift templates and actual job shift instances are separate concepts.
4. Job staff assignments are historical records and must not be overwritten.
5. A job may have multiple operational shifts and multiple personnel assignments.
6. Staff or shift changes do not create a new customer service request.
7. Customer on-site contacts remain separate from provider-company contacts and personnel.
8. Provider geographic service coverage remains controlled by the approved provider service-area model.
9. Detailed handover workflow, check-in rules, permissions, status values, and final table constraints remain intentionally open for later design.

---

## 11. Current Draft Relationship Model

```text
Provider
├── COMPANY
│   ├── Company Contacts
│   │   └── Job Company Contact Assignments
│   ├── Company Personnel
│   ├── Company Shift Templates
│   └── Service Request / Job
│       ├── Job Operational Shifts
│       └── Job Staff Assignments
│
└── FREELANCER
    └── Performs assigned job directly
```

This document is the approved drafting baseline for the next stage of company operations, staffing, shift, and handover architecture design.
