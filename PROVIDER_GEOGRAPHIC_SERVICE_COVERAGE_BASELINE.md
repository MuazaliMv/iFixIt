# iFixIt — Provider Geographic Service Coverage Baseline

**Status:** FROZEN / APPROVED BASELINE  
**Date:** 2026-08-20

## 1. Canonical Geographic Hierarchy

The platform shall use the following canonical Maldives hierarchy for provider coverage and service routing:

```text
Maldives
→ Atoll
→ City OR Island
→ Island / District / Ward / Phase
→ FixIt Service Area
```

The FixIt Service Area is the lowest applicable canonical serviceable node used for provider coverage and matching.

All provider geographic references must resolve through canonical `locations.location_id` values. Geographic names are display/reference data and must not replace canonical IDs.

## 2. Provider Types

Providers are classified as:

```text
COMPANY
FREELANCER
```

A provider must follow the coverage rules of its provider type.

## 3. Provider Company Coverage

Approved rule:

```text
COMPANY
→ 0..many FixIt Service Areas
```

A Provider Company may operate in zero, one, or many FixIt Service Areas.

A company may be created without service areas. In that state it remains registered but hidden from location-specific customer search/matching.

Once service areas are configured, the company appears only in the service areas explicitly assigned and permitted by its active provider/service rules.

Recommended junction concept:

```text
provider_service_areas
- provider_service_area_id
- provider_company_id
- service_area_location_id
- is_active
- effective_from
- effective_to
```

## 4. Freelancer Coverage

Approved rule:

```text
FREELANCER
→ exactly 1 FixIt Service Area
→ many approved service categories
→ many services within approved categories
```

A Freelancer is an independent marketplace provider and must be assigned to exactly one canonical FixIt Service Area.

Recommended direct relationship:

```text
freelancers.service_area_location_id
→ locations.location_id
```

The service-area foreign key must point to the canonical FixIt Service Area and must not be hard-coded to a specific subtype such as Ward.

A FixIt Service Area may correspond to a Ward, Phase, District, Island, or another approved serviceable node depending on the actual location structure.

Freelancers may hold multiple service-category approvals. Only approved categories may participate in customer search/matching. A freelancer may offer multiple services, but each publicly offered service must belong to a category that is approved for that freelancer.

## 5. Visibility Rules

```text
Company with 0 active service areas
→ registered but hidden from location-specific search

Company with active service areas
→ visible only in assigned/eligible service areas

Freelancer
→ must have exactly 1 FixIt Service Area
→ visible only in that service area
→ visible only for approved categories and active offered services
```

## 6. Hierarchical Search

Customer/provider search must support searches at multiple hierarchy levels.

### Search by Atoll
Resolve all descendant FixIt Service Areas beneath the selected Atoll, then return providers mapped to any qualifying descendant service area.

### Search by City
Resolve all descendant FixIt Service Areas beneath the selected City, then return providers mapped to any qualifying descendant service area.

### Search by Island
Resolve all descendant FixIt Service Areas beneath the selected Island, then return providers mapped to qualifying descendants.

### Search by Ward / District / Phase
Resolve the selected canonical node and applicable FixIt Service Area(s), then return providers explicitly assigned to those areas.

## 7. No Automatic Sibling Coverage

Assignment to one child service area does not automatically grant coverage to sibling areas or to all children of the parent.

Examples:

```text
Hulhumalé Phase 1
≠ automatically Hulhumalé Phase 2
```

```text
Hithadhoo
≠ automatically Hulhudhoo
```

```text
Maafannu
≠ automatically all of Malé City
```

## 8. Canonical Matching Rule

Provider geographic eligibility must resolve through canonical location IDs and service-area assignments, never free-text location names.

```text
Customer selected location
→ canonical location_id
→ resolve applicable FixIt Service Area
→ compare against provider geographic coverage
→ apply provider/service eligibility rules
→ return matching providers
```

For freelancers, matching must also validate that the requested service belongs to an approved freelancer category and is an active offered service.

## 9. Service-Area Target

Company coverage and freelancer location must point to the canonical FixIt Service Area record rather than hard-coding the database to a specific geographic subtype such as Ward or Phase.

## 10. Frozen Core Model

```text
Maldives
→ Atoll
→ City OR Island
→ Island / District / Ward / Phase
→ FixIt Service Area

PROVIDER
├── COMPANY
│   └── 0..many FixIt Service Areas
│
└── FREELANCER
    ├── exactly 1 FixIt Service Area
    ├── many approved service categories
    └── many services within approved categories
```

## 11. Final Frozen Principle

Geographic matching is controlled by canonical FixIt Service Areas. Companies may cover zero or many service areas. Freelancers are restricted to exactly one service area but may qualify for multiple approved service categories and multiple active services within those approved categories.
