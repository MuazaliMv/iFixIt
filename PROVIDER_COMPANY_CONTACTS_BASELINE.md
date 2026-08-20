# iFixIt — Provider Company Contacts Baseline

**Status:** Approved implementation baseline  
**Date:** 2026-08-20  
**Scope:** Provider company contact structure and provider-type execution model.

---

## 1. Provider Structure

The approved provider structure is:

```text
Provider
├── COMPANY
│   ├── Company Contacts
│   ├── Company Personnel
│   ├── Company Shifts
│   └── Job Staff Assignments
│
└── FREELANCER
    └── Freelancer performs assigned job directly
```

This establishes a clear distinction between provider companies and freelancers.

Company staff or technicians are not automatically treated as independent marketplace freelancers. They belong to the provider company operational model.

---

## 2. Company Contacts Table

Approved table structure:

```text
company_contacts

company_contact_id
provider_company_id

contact_name
phone
email

contact_type
department

is_primary
is_active

created_at
updated_at
```

Relationship:

```text
Provider Company
1 → many Company Contacts
```

A provider company may maintain multiple contacts for different operational or administrative purposes.

---

## 3. Approved Contact Types

The approved `contact_type` values are:

```text
GENERAL
MANAGER
DISPATCH
OPERATIONS
BILLING
EMERGENCY
JOB_COORDINATOR
OTHER
```

These values represent the role of the contact within the provider company.

---

## 4. Primary Contact Rule

A company may have multiple active contacts.

Recommended rule:

```text
At most one active contact per provider_company_id
may have is_primary = true
```

Other contacts remain available according to their contact type and department.

---

## 5. Data Integrity Requirements

At minimum:

- `provider_company_id` must reference an existing provider company.
- `contact_name` is required.
- at least one contact method should normally be available (`phone` or `email`).
- inactive contacts must not be used as default operational contacts.
- changing the primary contact should be auditable.
- deactivated historical contacts should normally be soft-deleted rather than physically removed when they have been referenced by jobs or communication logs.

---

## 6. Scope Boundary

This file records only the provider structure, company contact table, and approved contact-type values confirmed on 2026-08-20.

Detailed schemas and rules for:

- Company Personnel
- Company Shifts
- Job Staff Assignments
- Job handovers

remain to be finalized separately.
