# iFixIt — Freelancer Category & Service Coverage Model

**Status:** Approved architecture baseline  
**Date:** 2026-08-20  
**Scope:** Freelancer geographic assignment, category approval, offered services, and provider matching rules.

## 1. Freelancer

A freelancer is an independent provider.

A freelancer:
- belongs to exactly 1 FixIt Service Area
- can belong to many Service Categories
- can offer many Services

A freelancer is not company personnel.

## 2. Geographic Assignment

Each freelancer must be assigned to exactly one canonical FixIt Service Area.

Use:

```text
service_area_location_id
→ locations.location_id
```

Do not use a ward-specific foreign key because a valid service area may be:
- Ward
- Phase
- District
- Island
- Other approved FixIt Service Area

## 3. Service Category Master

Table:

```text
service_categories
```

Fields:

```text
category_id
category_name
description
is_active
created_at
updated_at
```

Examples:
- Plumbing
- Electrical
- AC Repair
- Appliance Repair

## 4. Freelancer Category Mapping

A freelancer can belong to many service categories.

A service category can belong to many freelancers.

Table:

```text
freelancer_categories
```

Fields:

```text
freelancer_id
category_id
verification_status
requested_at
reviewed_at
reviewed_by
suspended_at
```

Primary key:

```text
freelancer_id + category_id
```

Approved verification status values:

```text
PENDING
APPROVED
REJECTED
SUSPENDED
```

## 5. Category Visibility Rule

A freelancer may request multiple categories.

Only categories with:

```text
verification_status = APPROVED
```

may appear in customer searches and provider matching.

Example:

```text
Freelancer A

Plumbing → APPROVED
Electrical → PENDING
AC Repair → SUSPENDED
```

Freelancer A can only appear in customer searches for Plumbing.

## 6. Freelancer Table

Table:

```text
freelancers
```

Fields:

```text
freelancer_id
provider_id
service_area_location_id
status
is_available
created_at
updated_at
```

## 7. Service Category and Service Structure

A service category can contain multiple exact services.

Example:

```text
Plumbing
- Tap Repair
- Pipe Leakage
- Toilet Repair
- Water Pump Repair
```

Relationship:

```text
Service Category
1 → many Services
```

## 8. Freelancer Offered Services

A freelancer may offer one or many exact services within approved categories.

Table:

```text
freelancer_services
```

Fields:

```text
freelancer_id
service_id
is_active
created_at
updated_at
```

A freelancer must not publicly offer a service unless the parent service category has been APPROVED for that freelancer.

## 9. Matching Rule

A freelancer is eligible for a customer request only when:

```text
Freelancer status = ACTIVE
AND
Freelancer is available
AND
Freelancer service_area_location_id matches the requested FixIt Service Area
AND
The requested service is offered by the freelancer
AND
The parent service category is APPROVED
AND
The service is active
```

## 10. Example

Customer Request

Location:
Hulhumalé Phase 1

Category:
Plumbing

Service:
Pipe Leakage

Freelancer A:

```text
Active → Yes
Available → Yes
Service Area = Hulhumalé Phase 1 → Yes
Plumbing = APPROVED → Yes
Pipe Leakage offered → Yes
```

Result:

```text
MATCH
```

Freelancer B:

```text
Active → Yes
Available → Yes
Plumbing = APPROVED → Yes
Service Area = Hulhumalé Phase 2 → No
```

Result:

```text
NO MATCH
```

## 11. Company Personnel Separation

The provider structure remains:

```text
Provider

COMPANY
- Company Contacts
- Company Personnel
- Company Shifts
- Job Staff Assignments

FREELANCER
- Independent Provider
```

Company employees or technicians must not be stored as freelancers simply because they perform field work.

## 12. Final Relationship

```text
Freelancer

→ exactly 1 FixIt Service Area

→ many Freelancer Categories
   - each with verification status

→ many Offered Services
   - each service must belong to an approved category
```

## Final Rule

A freelancer is geographically restricted to one approved FixIt Service Area, may be approved for multiple service categories, and may offer multiple exact services within those approved categories.
