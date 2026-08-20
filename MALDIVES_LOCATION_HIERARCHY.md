# iFixIt — Maldives Location Hierarchy

**Status:** Reference baseline for location master data  
**Date:** 2026-08-20  
**Scope:** Maldives atolls, cities, islands, districts, wards, service areas, geographic hierarchy, and physical-connectivity notes used by iFixIt.

---

## 1. Purpose

This document records the Maldives location hierarchy used by iFixIt.

The system must distinguish between:

- geographic location
- administrative governance
- city membership
- island identity
- ward / district identity
- FixIt service-area identity
- physical land connectivity

The authoritative geographic hierarchy is:

```text
Maldives
  ↓
Atoll
  ↓
City OR Island
  ↓
Island / District / Ward
  ↓
FixIt Service Area
```

An **atoll always comes before a city geographically**.

A city may consist of:

- one island
- multiple islands
- multiple wards
- multiple districts
- a combination of islands, wards and districts

The database must therefore use a flexible parent-child location tree and must not assume that every city has the same internal structure.

---

## 2. Administrative Atolls

The Maldives location master shall include the following administrative atolls and traditional names.

| Administrative Atoll | Traditional Name | Capital / Governance Note |
|---|---|---|
| Haa Alif Atoll | Thiladhunmathi Uthuruburi | Dhiddhoo |
| Haa Dhaalu Atoll | Thiladhunmathi Dhekunuburi | Kulhudhuffushi City operates here |
| Shaviyani Atoll | Miladhunmadulu Uthuruburi | Funadhoo |
| Noonu Atoll | Miladhunmadulu Dhekunuburi | Manadhoo |
| Raa Atoll | Maalhosmadulu Uthuruburi | Ungoofaaru |
| Baa Atoll | Maalhosmadulu Dhekunuburi | Eydhafushi |
| Lhaviyani Atoll | Faadhippolhu | Naifaru |
| Kaafu Atoll | Malé Atholhu | Thulusdhoo; Malé City is geographically within Kaafu Atoll and separately city-governed |
| Alif Alif Atoll | Ari Atholhu Uthuruburi | Rasdhoo |
| Alif Dhaal Atoll | Ari Atholhu Dhekunuburi | Mahibadhoo |
| Vaavu Atoll | Felidhu Atholhu | Felidhoo |
| Meemu Atoll | Mulak Atholhu | Muli |
| Faafu Atoll | Nilandhe Atholhu Uthuruburi | Nilandhoo |
| Dhaalu Atoll | Nilandhe Atholhu Dhekunuburi | Kudahuvadhoo |
| Thaa Atoll | Kolhumadulu | Veymandoo |
| Laamu Atoll | Haddhunmathi | Fonadhoo |
| Gaafu Alif Atoll | Huvadhu Atholhu Uthuruburi | Villingili |
| Gaafu Dhaalu Atoll | Huvadhu Atholhu Dhekunuburi | Thinadhoo City operates here |
| Gnaviyani Atoll | Fuvahmulah | Governed as Fuvahmulah City |
| Seenu / Addu Atoll | Addu | Governed as Addu City |

---

## 3. Official Cities Used by iFixIt

The location master shall represent the following cities:

1. Malé City
2. Addu City
3. Fuvahmulah City
4. Kulhudhuffushi City
5. Thinadhoo City

Cities remain geographically linked to their atoll.

Examples:

```text
Kaafu Atoll
  ↓
Malé City
```

```text
Seenu / Addu Atoll
  ↓
Addu City
```

```text
Gnaviyani Atoll
  ↓
Fuvahmulah City
```

---

## 4. Malé City

### 4.1 Geographic relationship

```text
Kaafu Atoll
  ↓
Malé City
```

Malé belongs geographically to Kaafu Atoll while being governed as Malé City.

Geographic relationship and administrative governance must be stored separately.

### 4.2 Internal structure

```text
Kaafu Atoll
└── Malé City
    ├── Malé Island
    │   ├── Maafannu
    │   ├── Henveiru
    │   ├── Galolhu
    │   └── Machangolhi
    ├── Vilimalé
    └── Hulhumalé
```

### 4.3 Malé Island wards

| Ward | Notes |
|---|---|
| Maafannu | Western part of Malé Island |
| Henveiru | Eastern part of Malé Island |
| Galolhu | Southern-central part of Malé Island |
| Machangolhi | Central-western part of Malé Island |

### 4.4 Other Malé City areas

| Location | Classification for iFixIt |
|---|---|
| Vilimalé | Island / city district / service area |
| Hulhumalé | Island / city district / service area |

Example records:

```text
Maafannu
location_type = ward
parent = Malé Island
city = Malé City
atoll = Kaafu Atoll
is_service_area = true
```

```text
Hulhumalé
location_type = island
parent = Malé City
city = Malé City
atoll = Kaafu Atoll
is_service_area = true
```

---

## 5. Addu City

### 5.1 Geographic relationship

```text
Seenu / Addu Atoll
  ↓
Addu City
```

### 5.2 Selectable FixIt service areas

Addu City shall contain seven selectable iFixIt service areas:

1. Hithadhoo
2. Maradhoo
3. Maradhoo-Feydhoo
4. Feydhoo
5. Gan
6. Hulhudhoo
7. Meedhoo

### 5.3 Administrative / geographic classification

| Location | iFixIt Classification | Administrative / Geographic Note |
|---|---|---|
| Hithadhoo | District / service area | Largest main population centre |
| Maradhoo | District / service area | Southern chain |
| Maradhoo-Feydhoo | District / service area | Southern chain |
| Feydhoo | District / service area | Southern chain |
| Gan | Island / service area | Significant island containing Gan International Airport; not one of the six administrative districts |
| Hulhudhoo | District / island service area | Northern part of Addu City |
| Meedhoo | District / island service area | Northern part of Addu City |

Gan must be selectable in iFixIt but must not be falsely labelled as an administrative district.

Example:

```text
Gan
location_type = island
city = Addu City
atoll = Seenu / Addu Atoll
is_service_area = true
```

### 5.4 Physical connectivity

Administrative grouping must not be interpreted as land connectivity.

Recommended operational grouping:

```text
Addu City
├── Southern / Link Road group
│   ├── Hithadhoo
│   ├── Maradhoo
│   ├── Maradhoo-Feydhoo
│   ├── Feydhoo
│   └── Gan
│
└── Northern group
    ├── Hulhudhoo
    └── Meedhoo
```

**Hulhudhoo and Meedhoo are not connected by land to the southern Link Road group and must remain separate service locations.**

A provider serving Hithadhoo must not automatically be assumed to serve Hulhudhoo or Meedhoo merely because all belong to Addu City.

The location model should support fields such as:

```text
physical_island_id
land_connected_group_id
transport_group_id
is_land_connected
access_type
```

Example operational attributes:

```text
Hulhudhoo
city = Addu City
atoll = Seenu / Addu Atoll
is_land_connected_to_southern_chain = false
access_type = sea
```

```text
Meedhoo
city = Addu City
atoll = Seenu / Addu Atoll
is_land_connected_to_southern_chain = false
access_type = sea
```

---

## 6. Fuvahmulah City

### 6.1 Geographic relationship

```text
Gnaviyani Atoll
  ↓
Fuvahmulah City
```

Fuvahmulah is a single-island city divided into eight wards.

### 6.2 Wards

1. Dhadimagu
2. Dhiguvaandu
3. Maadhandu
4. Hoadhadu
5. Funaadu
6. Miskiyymagu
7. Mālegamu
8. Dhoodigamu

Hierarchy:

```text
Gnaviyani Atoll
└── Fuvahmulah City
    └── Fuvahmulah Island
        ├── Dhadimagu
        ├── Dhiguvaandu
        ├── Maadhandu
        ├── Hoadhadu
        ├── Funaadu
        ├── Miskiyymagu
        ├── Mālegamu
        └── Dhoodigamu
```

Each ward can be a selectable iFixIt service area.

---

## 7. Kulhudhuffushi City

### 7.1 Geographic relationship

```text
Haa Dhaalu Atoll
  ↓
Kulhudhuffushi City
  ↓
Kulhudhuffushi Island
```

Kulhudhuffushi operates as a single contiguous urban island without internal ward selection in the current iFixIt model.

For MVP:

```text
location_type = city / island
is_service_area = true
has_child_service_areas = false
```

---

## 8. Thinadhoo City

### 8.1 Geographic relationship

```text
Gaafu Dhaalu Atoll
  ↓
Thinadhoo City
  ↓
Thinadhoo Island
```

Thinadhoo operates as a single-island municipal unit without internal ward selection in the current iFixIt model.

For MVP:

```text
location_type = city / island
is_service_area = true
has_child_service_areas = false
```

---

## 9. Location Types

The location master must support at least:

```text
country
atoll
city
island
ward
district
service_area
```

A location's geographic type and its marketplace role are separate concepts.

Examples:

```text
Gan
location_type = island
is_service_area = true
```

```text
Maafannu
location_type = ward
is_service_area = true
```

---

## 10. Required Parent-Child Model

Every location should be able to reference its immediate parent through a canonical identifier.

Recommended core field:

```text
parent_location_id
```

Examples:

```text
Malé City → parent = Kaafu Atoll
Malé Island → parent = Malé City
Maafannu → parent = Malé Island
Addu City → parent = Seenu / Addu Atoll
Gan → parent = Addu City
Fuvahmulah City → parent = Gnaviyani Atoll
Dhadimagu → parent = Fuvahmulah Island
```

This relationship must use immutable IDs rather than free-text names.

---

## 11. Recommended Location Master Attributes

```text
location_id
name
slug
official_name
traditional_name
location_type
parent_location_id
atoll_id
city_id
island_id
governance_type
administrative_status
population
is_service_area
customer_selectable
provider_selectable
marketplace_status
service_enabled
provider_registration_enabled
latitude
longitude
physical_island_id
land_connected_group_id
transport_group_id
is_land_connected
access_type
description
display_order
is_active
created_at
updated_at
```

---

## 12. Location Finder and Maldives Map

iFixIt location discovery should support all of the following:

```text
Search
List
Maldives Map
Use My Current Location
```

All methods must resolve to the same canonical `location_id`.

Recommended flow:

```text
Maldives
  ↓
Choose Atoll
  ↓
Choose City OR Island
  ↓
If City, choose City Component
  ↓
Island / District / Ward
  ↓
Confirm FixIt Service Area
```

Example:

```text
Kaafu Atoll
→ Malé City
→ Malé Island
→ Maafannu
```

or:

```text
Kaafu Atoll
→ Malé City
→ Hulhumalé
```

or:

```text
Seenu / Addu Atoll
→ Addu City
→ Gan
```

The map must follow the same hierarchy and use verified geographic coordinates or geometry. No manually invented island boundaries or coordinates are permitted.

---

## 13. Provider Service-Area Rule

Provider coverage must be assigned at the actual service-area level and must not be inferred merely from membership in the same city.

Example:

```text
Provider: Addu Electrical
Service Areas:
✓ Hithadhoo
✓ Feydhoo
✓ Gan
```

This provider must not automatically become eligible for Hulhudhoo or Meedhoo unless those service areas are explicitly enabled according to provider and marketplace rules.

---

## 14. Geographic Matching Principle

Provider matching must preserve the existing local-island matching rule and additionally respect city/ward/service-area granularity.

A provider may appear only when all mandatory eligibility controls pass, including exact service and permitted geographic coverage.

Administrative membership must never override physical transport constraints.

For island-separated areas, provider service eligibility should consider:

- target island / service area
- land connectivity
- transport requirement
- approved cross-island coverage
- provider willingness
- marketplace fallback policy

---

## 15. Canonical Rule

The location system must always answer these separately:

```text
WHERE IS THIS PLACE?
= Atoll + geographic parent chain

WHAT KIND OF PLACE IS IT?
= City / Island / Ward / District

WHO GOVERNS IT?
= Administrative governance

IS IT PHYSICALLY CONNECTED?
= Land / sea / transport relationship

CAN FIXIT SERVE IT?
= Service-area and marketplace status
```

These concepts must resolve to one canonical location tree without being collapsed into a single free-text `location` field.

---

## 16. Current Recorded Hierarchy Summary

```text
Maldives
├── Haa Alif Atoll
├── Haa Dhaalu Atoll
│   └── Kulhudhuffushi City
├── Shaviyani Atoll
├── Noonu Atoll
├── Raa Atoll
├── Baa Atoll
├── Lhaviyani Atoll
├── Kaafu Atoll
│   └── Malé City
│       ├── Malé Island
│       │   ├── Maafannu
│       │   ├── Henveiru
│       │   ├── Galolhu
│       │   └── Machangolhi
│       ├── Vilimalé
│       └── Hulhumalé
├── Alif Alif Atoll
├── Alif Dhaal Atoll
├── Vaavu Atoll
├── Meemu Atoll
├── Faafu Atoll
├── Dhaalu Atoll
├── Thaa Atoll
├── Laamu Atoll
├── Gaafu Alif Atoll
├── Gaafu Dhaalu Atoll
│   └── Thinadhoo City
├── Gnaviyani Atoll
│   └── Fuvahmulah City
│       └── Fuvahmulah Island
│           ├── Dhadimagu
│           ├── Dhiguvaandu
│           ├── Maadhandu
│           ├── Hoadhadu
│           ├── Funaadu
│           ├── Miskiyymagu
│           ├── Mālegamu
│           └── Dhoodigamu
└── Seenu / Addu Atoll
    └── Addu City
        ├── Hithadhoo
        ├── Maradhoo
        ├── Maradhoo-Feydhoo
        ├── Feydhoo
        ├── Gan
        ├── Hulhudhoo
        └── Meedhoo
```

Further inhabited islands can be added under their respective atolls without changing this hierarchy model.
