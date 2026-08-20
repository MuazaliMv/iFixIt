# iFixIt — Provider Service Area Cardinality Rule

**Status:** Approved business rule  
**Date:** 2026-08-20  
**Branch context:** Maldives location/provider architecture

## Approved Rule

Provider geographic service coverage is constrained by provider type:

```text
COMPANY
→ 0..many FixIt Service Areas

FREELANCER
→ exactly 1 FixIt Service Area
```

## Company Logic

A provider company may exist with no active service areas during registration, verification, or setup.

If a company has zero active service areas:
- the company may remain registered;
- the company may complete verification/profile setup;
- the company must remain hidden from location-specific customer searches and matching.

If a company has one or more active service areas:
- the company may appear only for the service areas permitted by its active coverage records and matching rules.

Recommended relationship:

```text
Provider Company
1 → 0..many Company Service Areas
```

Each service-area record must reference the canonical `locations.location_id` for an approved FixIt Service Area.

## Freelancer Logic

Every freelancer must have exactly one active canonical FixIt Service Area.

Recommended field:

```text
freelancers.service_area_location_id
→ locations.location_id
```

A freelancer must not receive multiple service areas through the company service-area junction table.

The assigned location must resolve to a valid active FixIt Service Area.

## Separation Rule

Company multi-area coverage and freelancer single-area coverage must remain structurally separate so the database cannot accidentally grant multi-area coverage to a freelancer.

```text
COMPANY
→ company_service_areas junction table

FREELANCER
→ direct mandatory service_area_location_id
```

## Canonical Location Rule

Both company coverage records and freelancer service-area assignment must use canonical `location_id` values. Free-text location names, postal codes, administrative codes, GPS coordinates, or ward-specific IDs must not replace the canonical location reference.

## Final Constraint

```text
COMPANY    = 0..many service areas
FREELANCER = exactly 1 service area
```

This rule is approved for iFixIt provider geographic matching and database design.
