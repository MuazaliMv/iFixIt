# iFixIt — Company Personnel Schema Frozen Baseline

**Status:** FROZEN / APPROVED BASELINE  
**Date:** 2026-08-20  
**Scope:** Company personnel identity, role, employment, verification, assignability, optional system-user linkage, self-service update boundaries, and historical retention rules.

## 1. Core Relationship

```text
Provider Company
1 → many Company Personnel
```

Company personnel are people who work under a Provider Company. They are not freelancers and must not be modeled as independent marketplace providers.

## 2. Frozen Table

```text
company_personnel

personnel_id               UUID PRIMARY KEY
provider_company_id        UUID NOT NULL FOREIGN KEY
user_id                    UUID NULL FOREIGN KEY

employee_reference         VARCHAR NULL

full_name                  VARCHAR NOT NULL
preferred_name             VARCHAR NULL

phone                      VARCHAR NULL
email                      VARCHAR NULL

personnel_type             ENUM NOT NULL
job_title                  VARCHAR NULL
department                 VARCHAR NULL

employment_type            ENUM NULL
employment_status          ENUM NOT NULL

is_field_worker            BOOLEAN DEFAULT FALSE
is_job_assignable          BOOLEAN DEFAULT FALSE

verification_status        ENUM NOT NULL

joined_at                  TIMESTAMP NULL
left_at                    TIMESTAMP NULL

profile_photo_url          TEXT NULL
notes                      TEXT NULL

is_active                  BOOLEAN DEFAULT TRUE

created_at                 TIMESTAMP NOT NULL
updated_at                 TIMESTAMP NOT NULL
```

`user_id` is optional. A company personnel record may exist without login credentials or a system user account. If system access is required, the personnel record may be linked to a system user through `user_id`.

## 3. Personnel Types

Approved values:

```text
TECHNICIAN
HELPER
SPECIALIST
SUPERVISOR
TEAM_LEAD
DISPATCHER
OPERATIONS
MANAGER
OTHER
```

## 4. Employment Types

Approved values:

```text
FULL_TIME
PART_TIME
CONTRACT
TEMPORARY
OTHER
```

## 5. Employment Status

Approved values:

```text
ACTIVE
ON_LEAVE
SUSPENDED
ENDED
```

## 6. Verification Status

Approved values:

```text
NOT_REQUIRED
PENDING
VERIFIED
REJECTED
EXPIRED
SUSPENDED
```

## 7. Frozen Business Rules

1. Every company personnel record belongs to exactly one Provider Company.
2. Company Personnel must never be treated as a Freelancer.
3. A Provider Company may have zero or many personnel records.
4. Company Personnel may exist without a system user account or login credentials.
5. A Company Personnel record may optionally link to a system user account through nullable `user_id`.
6. Lack of a linked user account does not prevent the person from being represented in job staffing or historical records.
7. Authorized company users may record operational activity on behalf of personnel who do not use the system directly, subject to audit logging of who performed the work versus who recorded the information.
8. If Company Personnel are linked to a system user account and permitted to use the system, they may update their own approved self-service profile fields.
9. Self-service personnel updates must be limited to personal/contact/profile information and must not allow the personnel user to alter company-controlled employment, authorization, verification, or provider-coverage fields.
10. Company-controlled fields must be updated only by an authorized Provider Company manager/admin or platform administrator, according to role permissions.
11. Only personnel with `employment_status = ACTIVE`, `is_active = true`, and `is_job_assignable = true` may receive new job assignments.
12. Only personnel with `is_field_worker = true` may be recorded as physically onsite.
13. Personnel history must not be deleted merely because the person leaves the company.
14. When employment ends, the normal state transition is:

```text
employment_status = ENDED
is_active = false
left_at = <timestamp>
```

15. Historical Job Staff Assignments must remain unchanged after employment ends.
16. Personnel verification is independent from Provider Company verification.
17. Personnel location must not independently control or expand Provider Company service-area coverage.
18. `is_field_worker` and `is_job_assignable` represent different concepts and must remain separate.
19. Private personnel data must not automatically be exposed to customers.
20. All personnel self-service updates must be audit logged with the acting `user_id`, timestamp, and changed fields.

## 8. Self-Service Update Boundary

When a Company Personnel record is linked to a system user account, the personnel user may update their own self-service fields such as:

```text
preferred_name
phone
email
profile_photo_url
```

Subject to company policy, the application may also allow updates to non-authoritative profile information that does not alter employment, verification, job eligibility, or marketplace coverage.

The personnel user must NOT directly update authoritative company-controlled fields such as:

```text
provider_company_id
user_id
employee_reference
personnel_type
job_title
department
employment_type
employment_status
is_field_worker
is_job_assignable
verification_status
joined_at
left_at
is_active
```

If a personnel user requests a change to an authoritative field, the system should route it to an authorized company manager/admin workflow rather than directly applying the change.

## 9. Operational Examples

```text
Manager
is_field_worker = false
is_job_assignable = false
```

```text
Dispatcher
is_field_worker = false
is_job_assignable = true
```

```text
Technician
is_field_worker = true
is_job_assignable = true
```

Optional login linkage examples:

```text
Technician Ahmed
user_id = NULL
→ can still be assigned to jobs
→ dispatcher/manager records activity on his behalf
```

```text
Supervisor Hassan
user_id = <system user UUID>
→ may log in directly
→ may perform permitted supervisor actions in the system
→ may update his own approved self-service profile fields
```

## 10. Relationship to Other Approved Modules

```text
PROVIDER COMPANY
├── Company Contacts
├── Company Personnel
│   └── optional System User Account
│       └── self-service profile updates within permission boundary
├── Company Service Areas
└── Jobs
    └── Job Staff Assignments
        └── Company Personnel
```

Provider Company service coverage remains governed by the separately approved rule:

```text
COMPANY → 0..many service areas
FREELANCER → exactly 1 service area
```

## 11. Explicitly Outside This Freeze

The following is conceptually supported but NOT frozen by this document:

```text
company_personnel_skills
```

The detailed schema, verification logic, and category/service relationship for company personnel skills will be designed separately.

Also outside this freeze are the final detailed schemas for:

- Company Shift Templates
- Job Operational Shifts
- Job Staff Assignments
- Job Handover workflows
- Detailed system-user permission role matrix for linked personnel accounts

## 12. Final Frozen Principle

The Provider Company is the marketplace service provider. Company Personnel are operational people under that company. Personnel do not require system user accounts to exist or participate in staffing records. When direct system access is needed, personnel may optionally be linked to a system user account. Linked personnel may maintain their own approved self-service profile information, while company-authoritative employment, verification, eligibility, and coverage fields remain controlled by authorized company or platform administrators. This does not change the personnel member's identity as company personnel or the Provider Company's approved service-area coverage.
