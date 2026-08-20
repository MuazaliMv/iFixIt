# iFixIt — Provider Geographic Service Coverage Baseline

**Status:** Approved architecture baseline  
**Date:** 2026-08-20

## 1. Geographic Hierarchy

The provider geographic mapping model shall use the following canonical hierarchy:

```text
Atoll
↓
City OR Island
↓
Island / District / Ward / Phase
↓
FixIt Service Area
```

The FixIt Service Area is the lowest applicable canonical serviceable node used for provider coverage and matching.

## 2. Provider Types

Providers are classified as:

```text
COMPANY
FREELANCER
```

## 3. Provider Company Coverage

A provider company may operate in zero, one, or many FixIt Service Areas.

Recommended relationship:

```text
Provider Company
1 → many Provider Service Areas
```

A company may be created without service areas. In that state it remains registered but hidden from location-specific customer search/matching.

Once service areas are configured, the company appears only in the areas explicitly assigned and permitted by its active provider/service rules.

Recommended junction table concept:

```text
provider_service_areas
- provider_service_area_id
- provider_id
- service_area_location_id
- is_active
- effective_from
- effective_to
```

## 4. Individual Provider Coverage

For the current MVP business rule, an individual/freelancer provider is restricted to exactly one FixIt Service Area.

Recommended direct relationship:

```text
individual_provider.service_area_location_id
→ locations.location_id
```

This must reference a canonical serviceable location node.

The one-region restriction is a business rule for the current architecture. The canonical location system itself must remain flexible enough to support future policy changes without redesigning location master data.

## 5. Visibility Rules

```text
Company with 0 service areas
→ registered but hidden from location-specific search

Company with active service areas
→ visible only in assigned/eligible service areas

Individual provider
→ must have exactly 1 service area
→ visible only in that service area
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

## 9. Service-Area Target

Company coverage and individual provider location must point to the canonical FixIt Service Area record rather than hard-coding the database to a specific geographic subtype such as Ward or Phase.

A FixIt Service Area may correspond to an approved Ward, Phase, District, Island, or other canonical lowest serviceable node depending on the actual location structure.

## 10. Approved Core Model

```text
Provider
├── Company
│   └── 0..many FixIt Service Areas
│
└── Individual / Freelancer
    └── exactly 1 FixIt Service Area

FixIt Service Area
└── canonical location hierarchy
    └── Atoll → City OR Island → Island / District / Ward / Phase
```

This document is the approved implementation baseline for provider geographic mapping and location-specific visibility/search in iFixIt.
