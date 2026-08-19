# iFixIt — Context Diagram Level 0

**View:** Business/system context  
**Purpose:** Show iFixIt as one system and the external actors/systems around it.

```mermaid
flowchart LR
    C[Customer]
    P[Provider / Technician]
    A[Administrator]
    IFX[[iFixIt Platform]]
    COM[Communication Services\nSMS / WhatsApp / Email / Push]
    PAY[Local Payment Systems\nBanks / Mobile Money / Cash]
    MEDIA[Media Storage\nImages / Documents]
    MAPS[Maps & Location Services]
    OBS[Analytics & Monitoring]
    VERIFY[Identity / Business Verification]

    C -->|Searches, requests, bookings, messages| IFX
    IFX -->|Providers, results, job updates, notifications| C

    P -->|Profile, services, availability, accept/decline, job actions| IFX
    IFX -->|Leads, assignments, customer/job information| P

    A -->|Approvals, configuration, moderation| IFX
    IFX -->|Reports, audit logs, alerts| A

    IFX -->|OTP, messages, notifications| COM
    COM -->|Delivery status / webhooks| IFX

    IFX -->|Payment instructions / method information only| PAY
    PAY -->|Off-platform payment outcome acknowledged by users| IFX

    IFX -->|Upload / retrieve| MEDIA
    MEDIA -->|Files / URLs| IFX

    IFX -->|Location queries| MAPS
    MAPS -->|Location/routing data| IFX

    IFX -->|Logs / events / metrics| OBS
    OBS -->|Insights / alerts| IFX

    IFX -->|Verification request| VERIFY
    VERIFY -->|Verification status/result| IFX
```

## Boundary Rules

- iFixIt connects customers and providers; it does not process or hold customer repair funds in MVP.
- Local payment systems are external to iFixIt.
- Provider subscription payments to iFixIt are a separate platform-payment concern.
- All location matching resolves to canonical Atoll/Island IDs before matching logic executes.
- Cross-atoll dispatch is never silent.

## Current Implementation Status

The central identity, location, catalogue, provider, search/matching, lead and assignment foundations are represented in migrations 0001–0005. Communication providers, media storage, maps, monitoring and external verification are target integrations unless separately implemented later.
