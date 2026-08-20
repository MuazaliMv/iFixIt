# iFixIt — Company Personnel Schema Frozen Baseline

**Status:** FROZEN / APPROVED BASELINE  
**Date:** 2026-08-20  
**Scope:** Company personnel identity, role, employment, verification, assignability, and historical retention rules.

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
4. Only personnel with `employment_status = ACTIVE`, `is_active = true`, and `is_job_assignable = true` may receive new job assignments.
5. Only personnel with `is_field_worker = true` may be recorded as physically onsite.
6. Personnel history must not be deleted merely because the person leaves the company.
7. When employment ends, the normal state transition is:

```text
employment_status = ENDED
is_active = false
left_at = <timestamp>
```

8. Historical Job Staff Assignments must remain unchanged after employment ends.
9. Personnel verification is independent from Provider Company verification.
10. Personnel location must not independently control or expand Provider Company service-area coverage.
11. `is_field_worker` and `is_job_assignable` represent different concepts and must remain separate.
12. Private personnel data must not automatically be exposed to customers.

## 8. Operational Examples

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

## 9. Relationship to Other Approved Modules

```text
PROVIDER COMPANY
├── Company Contacts
├── Company Personnel
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

## 10. Explicitly Outside This Freeze

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

## 11. Final Frozen Principle

The Provider Company is the marketplace service provider. Company Personnel are operational people under that company. Their records support staffing, dispatch, onsite execution, verification, and historical audit without turning those people into independent freelancers or changing the company’s approved service-area coverage.
