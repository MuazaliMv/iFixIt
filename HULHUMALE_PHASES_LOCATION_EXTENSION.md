# iFixIt — Hulhumalé Phase 1 & Phase 2 Location Extension

**Status:** Confirmed location hierarchy rule  
**Date:** 2026-08-20  
**Scope:** Hulhumalé sub-location structure for iFixIt service-area selection and provider matching.

---

## 1. Confirmed Hierarchy

Hulhumalé remains a parent location under Malé City. It contains two selectable child service areas:

```text
Maldives
└── Kaafu Atoll
    └── Malé City
        └── Hulhumalé
            ├── Hulhumalé Phase 1
            └── Hulhumalé Phase 2
```

## 2. Location Roles

### Hulhumalé

```text
location_type = island / city district
parent = Malé City
atoll = Kaafu Atoll
city = Malé City
has_child_service_areas = true
```

Hulhumalé is the parent geographic location and should not be duplicated as separate unrelated records for Phase 1 and Phase 2.

### Hulhumalé Phase 1

```text
location_type = service_area
parent = Hulhumalé
atoll = Kaafu Atoll
city = Malé City
island = Hulhumalé
is_service_area = true
customer_selectable = true
provider_selectable = true
```

### Hulhumalé Phase 2

```text
location_type = service_area
parent = Hulhumalé
atoll = Kaafu Atoll
city = Malé City
island = Hulhumalé
is_service_area = true
customer_selectable = true
provider_selectable = true
```

## 3. Customer Location Selection

Recommended selection flow:

```text
Kaafu Atoll
→ Malé City
→ Hulhumalé
→ Hulhumalé Phase 1 OR Hulhumalé Phase 2
→ Confirm Location
```

If a precise address or GPS point is provided, it must resolve to the selected canonical phase/service-area record where possible.

## 4. Provider Coverage Rule

Providers may select:

```text
Hulhumalé Phase 1
Hulhumalé Phase 2
or both
```

Provider eligibility must use the selected canonical service-area ID.

A provider serving only Hulhumalé Phase 1 must not automatically be considered to serve Hulhumalé Phase 2 unless:

- Phase 2 is explicitly selected in the provider's service areas; or
- a future parent-location inheritance rule is deliberately enabled by iFixIt policy.

The safer MVP rule is explicit child-area selection.

## 5. Request Example

```text
Customer Request
Service: AC Repair
Atoll: Kaafu Atoll
City: Malé City
Island / District: Hulhumalé
Service Area: Hulhumalé Phase 2
Address: customer-supplied structured address
GPS: optional exact latitude / longitude
```

The authoritative matching key remains the canonical `location_id` of Hulhumalé Phase 2.

## 6. Address Relationship

A customer may have multiple saved addresses in either phase.

Example:

```text
Customer
├── Home → Hulhumalé Phase 1
├── Office → Hulhumalé Phase 1
└── Family Address → Hulhumalé Phase 2
```

Each service request references one selected address/location snapshot.

## 7. Canonical Rule

```text
Hulhumalé
= parent island / city district

Hulhumalé Phase 1
= child FixIt service area

Hulhumalé Phase 2
= child FixIt service area
```

Search, list, map, GPS, address entry, provider coverage and service matching must resolve to the same canonical location records.