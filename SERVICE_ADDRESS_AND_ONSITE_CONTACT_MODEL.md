# iFixIt — Service Address & On-Site Contact Model

**Status:** Approved implementation reference  
**Date:** 2026-08-20  
**Scope:** Customer service addresses, precise geo coordinates, location sharing, and one-to-many on-site contacts for service requests.

---

## 1. Core Principle

A service request must separate three concepts:

```text
Request Owner
    ↓
Service Address / Service Location
    ↓
One or More On-Site Contacts
```

The customer who creates the request remains the request owner unless a separate authorization model explicitly grants additional rights.

On-site contacts exist to help the provider reach, access, and coordinate work at the service location. They do not automatically become owners of the request.

---

## 2. Service Address Model

Recommended service-address fields:

```text
service_address_id
customer_id

location_id
atoll_id
city_id
island_id
ward_or_district_id

house_name
building_name
apartment_unit
street_name
road_name
block_or_zone

landmark
address_notes
postal_code

latitude
longitude

address_type
is_default
is_verified
created_at
updated_at
```

`location_id` is the canonical FixIt location reference and remains authoritative for geographic matching.

Latitude and longitude are supplementary precision data used for map display, directions, validation, and navigation.

---

## 3. Customer Address Entry Options

The customer may provide an address through any combination of:

- canonical location selection
- house or building name
- street / road
- apartment / unit
- landmark
- written directions
- current device location
- dropped map pin

Recommended UI:

```text
Where should the provider come?

Atoll
[ Kaafu Atoll ]

City / Island
[ Malé City ]

Area
[ Hulhumalé ]

House / Building
[ __________________ ]

Street / Road
[ __________________ ]

Apartment / Unit
[ __________________ ]

Landmark
[ __________________ ]

Additional directions
[ ______________________________ ]

[ Use Current Location ]
[ Drop Pin on Map ]
```

---

## 4. Geo Coordinate Sharing

A service request may store:

```text
service_location_id
service_latitude
service_longitude
service_address
service_landmark
location_notes
```

The canonical location controls provider matching.

Exact coordinates help the authorized provider physically reach the job.

Recommended privacy flow:

```text
Request created
    ↓
Potential providers see service area only
    ↓
Customer selects provider / provider is assigned and accepts
    ↓
Authorized provider receives exact address + map pin + coordinates + access notes
```

Exact GPS coordinates must not be exposed publicly or to all providers who merely appear in search results.

Recommended sharing-state field:

```text
location_share_status =
AREA_ONLY
EXACT_AFTER_ACCEPTANCE
EXACT_SHARED
WITHHELD_BY_CUSTOMER
```

---

## 5. On-Site Contact Relationship

One service request may have one or many on-site contacts.

```text
Service Request
    1
    ↓
    many
On-Site Contacts
```

Do not model contacts as fixed fields such as `contact_1`, `contact_2`, or `contact_3`.

Use a normalized child table.

Recommended table:

```text
service_request_contacts

contact_id
service_request_id

contact_source
customer_id
saved_contact_id
contact_name_snapshot
contact_phone_snapshot

contact_role
contact_notes

authority_level
is_primary_contact
contact_priority

share_with_provider
is_active

created_at
updated_at
```

Recommended `contact_source` values:

```text
CUSTOMER
SAVED_CONTACT
MANUAL
```

When `contact_source = CUSTOMER`, `customer_id` references the booking customer. Snapshot fields preserve the contact details that were in effect for that request.

---

## 6. Default Booking-Customer Contact Rule

Every service request must have at least one on-site contact.

By default, the person who books the service is automatically the primary on-site contact.

```text
Booking Customer
= Default Primary On-Site Contact
```

Recommended customer UI:

```text
Who should the provider contact on arrival?

(•) Me — Booking Customer
( ) Someone else

[ + Add another contact ]
```

The customer may:

- keep themselves as the primary contact;
- add one or many additional contacts;
- make another active contact the primary contact;
- keep themselves as a secondary contact after assigning another primary contact;
- remove themselves from on-site contact duties where at least one other valid active contact remains.

Changing the on-site contact does not change ownership of the service request.

---

## 7. Primary and Secondary Contacts

A request may have any number of active on-site contacts, but only one active contact should be marked as the primary contact.

Example:

```text
Request #1234

On-Site Contacts
1. Booking Customer — Primary Contact
2. Ahmed — Secondary Contact
3. Building Security — Access Contact
```

Recommended constraint:

```text
Exactly one active contact per active service request
must have is_primary_contact = true
```

If the primary contact becomes inactive, another active contact must be promoted before the change is completed.

---

## 8. Contact Authority Levels

Recommended values:

```text
CONTACT_ONLY
ACCESS_COORDINATION
JOB_COORDINATION
```

### CONTACT_ONLY
May receive calls/messages and help the provider locate the property.

### ACCESS_COORDINATION
May additionally coordinate access such as gate, lobby, key, security desk, or entry arrangements.

### JOB_COORDINATION
May coordinate operational details of the visit where permitted by policy.

For MVP, alternate contacts should default to:

```text
CONTACT_ONLY
```

unless the request owner explicitly grants a higher level.

---

## 9. Request-Owner Authority

The request owner remains responsible for protected actions unless specific delegation is added later.

An on-site contact does **not automatically** gain permission to:

- change the service request
- approve pricing
- approve additional charges
- cancel the request
- change provider
- confirm final completion
- issue refunds
- submit formal complaints on behalf of the owner
- modify payment instructions

These rights must remain with the request owner or be governed by a separate explicit authorization model.

---

## 10. Customer UI

Recommended contact selector:

```text
Who should the provider contact on arrival?

(•) Me — Booking Customer
( ) Someone else

[ + Add another contact ]
```

If the customer adds more people:

```text
On-Site Contacts

PRIMARY
Booking Customer
[ Phone ]

SECONDARY
Ahmed
Brother
[ Phone ]

ACCESS CONTACT
Building Security
[ Phone ]

[ + Add Another Contact ]
```

Each added contact may have:

```text
Name
Phone
Role / Relationship
Authority Level
Contact Notes
Primary Contact toggle
Share with Provider toggle
```

---

## 11. Provider UI

Once the provider is authorized to see job details:

```text
On-Site Contacts

PRIMARY
Booking Customer
[ Call ] [ Message ]

SECONDARY
Ahmed
Brother
[ Call ] [ Message ]

ACCESS CONTACT
Building Security
[ Call ]
```

The provider UI should clearly distinguish:

- request owner
- booking customer
- primary on-site contact
- secondary contacts
- access-only contacts

---

## 12. Provider Visibility Rule

Before provider acceptance / assignment:

```text
Visible:
- service area
- approximate location context
- service details permitted by marketplace rules

Hidden:
- exact house/building address
- precise GPS coordinates
- private access instructions
- on-site contact phone numbers unless policy explicitly allows otherwise
```

After provider acceptance / authorization:

```text
Visible:
- exact address
- landmark
- map pin
- latitude/longitude
- access instructions
- authorized on-site contacts
```

---

## 13. Contact Validation Rules

Recommended validation:

- every active service request must have at least one active on-site contact;
- exactly one active on-site contact must be primary;
- the booking customer is created as the default primary contact when the request is created;
- `service_request_id` must reference an existing request;
- `contact_name_snapshot` is required for a non-customer contact;
- `contact_phone_snapshot` is required when the provider is expected to call or message that contact;
- only active contacts may be displayed to providers;
- a contact marked `share_with_provider = false` must not be exposed in provider-facing APIs;
- changing the primary contact must be auditable;
- removing the booking customer as the on-site contact must not transfer request ownership;
- deleting a contact already used in an active job should normally be soft-delete / deactivate rather than destructive deletion.

---

## 14. Audit Events

Audit at minimum:

```text
SERVICE_ADDRESS_CREATED
SERVICE_ADDRESS_UPDATED
SERVICE_PIN_UPDATED
LOCATION_SHARE_STATUS_CHANGED
ONSITE_CONTACT_ADDED
ONSITE_CONTACT_UPDATED
ONSITE_CONTACT_DEACTIVATED
PRIMARY_CONTACT_CHANGED
CONTACT_AUTHORITY_CHANGED
CONTACT_SHARE_STATUS_CHANGED
```

Each event should include actor, timestamp, request ID, previous value where applicable, and new value.

---

## 15. Recommended API Shape

Conceptual resources:

```text
POST   /service-requests/{request_id}/contacts
GET    /service-requests/{request_id}/contacts
PATCH  /service-requests/{request_id}/contacts/{contact_id}
DELETE /service-requests/{request_id}/contacts/{contact_id}   [soft deactivate]

PATCH  /service-requests/{request_id}/service-address
PATCH  /service-requests/{request_id}/location-share-status
```

Provider-facing responses must filter contact/address fields according to authorization and job state.

---

## 16. Example Request

```text
Service: AC Repair

Canonical Location:
Kaafu Atoll
→ Malé City
→ Hulhumalé

Address:
Example Tower
Unit 5A
Nirolhu Magu
Near Central Park

Geo:
latitude = <customer supplied/verified>
longitude = <customer supplied/verified>

Request Owner:
Customer A

On-Site Contacts:
1. Customer A — Booking Customer — Primary — CONTACT_ONLY
2. Ahmed — Secondary — CONTACT_ONLY
3. Building Security — Access Contact — ACCESS_COORDINATION
```

Provider matching uses the canonical service location.

Provider navigation uses the exact address and coordinates once sharing is authorized.

Provider arrival coordination uses the one-to-many on-site contacts.

---

## 17. Final Rule

The implementation must preserve the following separation:

```text
WHO OWNS THE REQUEST?
= Customer / Request Owner

WHO IS CONTACTED BY DEFAULT?
= Booking Customer as Primary On-Site Contact

WHERE IS THE JOB?
= Canonical Location + Service Address + Optional Geo Coordinates

WHO ELSE CAN HELP THE PROVIDER ON SITE?
= Zero or Many Additional On-Site Contacts

WHO MAY MAKE PROTECTED JOB DECISIONS?
= Request Owner unless explicitly delegated by a separate authorization model
```

This model is the approved basis for iFixIt service-address and on-site-contact implementation.
