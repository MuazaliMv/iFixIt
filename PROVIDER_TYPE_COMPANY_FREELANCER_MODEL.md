# iFixIt — Provider Type Model

**Status:** Approved implementation reference  
**Date:** 2026-08-20  
**Scope:** Defines provider identity types for iFixIt.

---

## 1. Core Rule

iFixIt providers may operate as either:

```text
COMPANY
FREELANCER
```

Both provider types may register, complete verification, select services, define service areas, receive leads, respond to requests, manage jobs, receive reviews, and use the provider dashboard subject to the same marketplace eligibility rules.

Provider type must not be inferred from display name or business name. It must be stored explicitly.

---

## 2. Provider Record

Recommended core provider fields:

```text
providers

provider_id
provider_type            -- COMPANY | FREELANCER
account_user_id

display_name
legal_name
business_name            -- nullable for freelancer
registration_number      -- nullable / required according to provider type and verification policy
contact_phone
contact_email

verification_status
approval_status
subscription_status
availability_status

is_active
created_at
updated_at
```

---

## 3. Company Provider

A company/business provider may have:

```text
provider_type = COMPANY
business_name
legal_name
business_registration_number
company_contact_phone
company_contact_email
registered_address
operational_locations
service_areas
```

A company may later support multiple staff/technicians under the same provider organization without changing the customer-facing provider identity.

---

## 4. Freelancer Provider

An individual provider may have:

```text
provider_type = FREELANCER
legal_name
display_name
personal_contact_phone
contact_email
operational_base
service_areas
```

A freelancer does not need a fake company record. Business-only fields remain nullable or are governed by verification requirements.

---

## 5. Common Provider Capabilities

Both COMPANY and FREELANCER providers may have:

- one or many supported services
- one or many service areas
- registered and/or operational locations
- provider profile
- availability
- subscription
- quotations/responses
- jobs
- ratings and reviews
- complaints/disputes
- audit history

Provider matching must use eligibility, exact service, approved service areas, availability, approval status, subscription rules, and transport/location rules — not provider type alone.

---

## 6. UI Registration Rule

Provider onboarding should begin with:

```text
How will you provide services?

( ) Company / Business
( ) Freelancer / Individual
```

The selected type controls which verification/profile fields are shown next.

### Company fields

```text
Company / Business Name
Legal Name
Registration Number
Business Contact
Registered Address
Operational Location(s)
```

### Freelancer fields

```text
Full Name
Display / Trading Name (optional)
Contact Number
Operational Base
```

Both then continue to:

```text
Select Services
→ Select Service Areas
→ Verification
→ Subscription (where applicable)
→ Approval / Activation
```

---

## 7. Database Relationship

```text
Provider
├── provider_type = COMPANY | FREELANCER
├── 1 → many Provider Locations
├── 1 → many Provider Service Areas
├── 1 → many Provider Services
└── 1 → many Jobs / Responses / Reviews
```

Future company-team support may add:

```text
Provider Company
    1
    ↓
    many
Provider Staff / Technicians
```

This future relationship must not require freelancers to create organization records.

---

## 8. Final Rule

The system must always distinguish:

```text
WHO PROVIDES THE SERVICE?
= Provider

WHAT KIND OF PROVIDER?
= COMPANY or FREELANCER

WHERE CAN THEY WORK?
= Provider Service Areas

WHAT CAN THEY DO?
= Provider Services

ARE THEY ELIGIBLE FOR THIS REQUEST?
= Approval + Service + Location + Availability + Subscription + Marketplace Rules
```
