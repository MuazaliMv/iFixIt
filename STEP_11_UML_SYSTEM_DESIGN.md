# iFixIt — Step 11: UML System Design

**Document Type:** UML / System Design Blueprint  
**Status:** Implementation Baseline  
**Version:** 1.0  
**Date:** 2026-08-19

---

## 1. Purpose

This document translates the approved iFixIt business, functional, location-matching, database and workflow specifications into a developer-readable UML design package.

It must be read together with:
- `MVP_BUSINESS_MODEL_AND_SCOPE_FREEZE.md`
- `LOCAL_ISLAND_MATCHING_AND_LOCATION_ARCHITECTURE.md`
- `STEP_3_DETAILED_USE_CASES_AND_BUSINESS_RULES.md`
- `STEP_5_FUNCTIONAL_SPECIFICATION_FREEZE.md`
- `STEP_6_DATABASE_SCHEMA_AND_DATA_DICTIONARY.md`
- `STEP_7_API_CONTRACTS.md`
- `STEP_8_ROLES_AND_PERMISSION_MATRIX.md`
- `STEP_9_FORMAL_STATE_TRANSITION_MATRICES.md`

Where a diagram simplifies a rule, the detailed source document remains authoritative.

---

# 2. UML Package Overview

The iFixIt UML baseline consists of eight core diagrams:

1. System Use Case Diagram
2. Domain Class Diagram
3. Customer Repair Activity Diagram
4. Island Matching Activity Diagram
5. Smart Matching Sequence Diagram
6. Direct Provider Booking Sequence Diagram
7. Repair Job State Diagram
8. Component / Architecture Diagram

These diagrams cover who uses the system, the principal domain objects, repair workflow, local-island dispatch behavior, runtime interactions and system structure.

---

# 3. UML-01 — System Use Case Diagram

```mermaid
flowchart LR
    Customer((Customer))
    Provider((Provider / Technician))
    Admin((Admin))
    Payment((Payment Gateway))
    Notify((Notification Service))

    subgraph iFixIt
        UC1[Register / Login]
        UC2[Search Repair Service]
        UC3[Choose Provider]
        UC4[Create Repair Request]
        UC5[Smart Match Provider]
        UC6[Track Repair]
        UC7[Approve / Reject Quote]
        UC8[Confirm Completion]
        UC9[Submit Review]
        UC10[Raise Complaint]
        UC11[Warranty Claim]

        UP1[Register as Provider]
        UP2[Manage Services]
        UP3[Manage Operational Base / Service Areas]
        UP4[Accept / Decline Request]
        UP5[Schedule Inspection]
        UP6[Record Diagnosis]
        UP7[Create Quotation]
        UP8[Perform Repair]
        UP9[Complete Job]

        UA1[Verify Provider]
        UA2[Manage Catalogue]
        UA3[Manage Atolls / Islands]
        UA4[Assign / Reassign Provider]
        UA5[Manage Complaints]
        UA6[Manage Subscriptions]
        UA7[Reporting]
        UA8[Audit]
        UA9[Authorize Geographic Override]
    end

    Customer --> UC1
    Customer --> UC2
    Customer --> UC3
    Customer --> UC4
    Customer --> UC5
    Customer --> UC6
    Customer --> UC7
    Customer --> UC8
    Customer --> UC9
    Customer --> UC10
    Customer --> UC11

    Provider --> UP1
    Provider --> UP2
    Provider --> UP3
    Provider --> UP4
    Provider --> UP5
    Provider --> UP6
    Provider --> UP7
    Provider --> UP8
    Provider --> UP9

    Admin --> UA1
    Admin --> UA2
    Admin --> UA3
    Admin --> UA4
    Admin --> UA5
    Admin --> UA6
    Admin --> UA7
    Admin --> UA8
    Admin --> UA9

    UA6 --> Payment
    UC4 --> Notify
    UP4 --> Notify
    UP7 --> Notify
    UP9 --> Notify
```

### Interpretation

Customer use cases center on finding service, booking, repair tracking and post-completion actions. Provider use cases center on eligibility, service geography, request acceptance, inspection/quotation and repair execution. Admin use cases cover governance, verification, assignment, configuration, reporting and audit.

---

# 4. UML-02 — Domain Class Diagram

```mermaid
classDiagram

class User {
    +UUID id
    +string verifiedPhone
    +string email
    +string accountStatus
    +string primaryRole
}

class CustomerProfile {
    +UUID id
    +string fullName
}

class ProviderProfile {
    +UUID id
    +string publicName
    +string approvalStatus
    +string suspensionStatus
    +string availabilityStatus
    +boolean acceptingLeads
}

class RepairService {
    +UUID id
    +string code
    +string name
    +string workflowType
}

class Atoll {
    +UUID id
    +string code
    +string officialName
    +boolean active
}

class Island {
    +UUID id
    +string canonicalName
    +string displayName
    +boolean serviceable
    +boolean active
}

class IslandAlias {
    +UUID id
    +string alias
    +string normalizedAlias
}

class ProviderLocation {
    +UUID id
    +string locationType
    +string address
    +boolean primary
}

class ProviderServiceArea {
    +UUID id
    +string serviceStatus
    +boolean crossIslandAllowed
    +decimal travelFee
}

class RepairRequest {
    +UUID id
    +string ticketNo
    +string problemDescription
    +string urgency
    +string status
    +string matchingScope
}

class MatchingAttempt {
    +UUID id
    +string matchingStage
    +int eligibleProviderCount
    +string failureReason
    +string algorithmVersion
}

class RepairLead {
    +UUID id
    +decimal rankScore
    +string status
}

class RepairAssignment {
    +UUID id
    +string source
    +string status
}

class RepairJob {
    +UUID id
    +string jobNo
    +string status
}

class Inspection {
    +UUID id
    +string status
    +string diagnosisSummary
}

class Quotation {
    +UUID id
    +int currentVersionNo
    +string status
    +decimal total
}

class QuotationVersion {
    +UUID id
    +int versionNo
    +string status
    +decimal total
}

class QuotationItem {
    +UUID id
    +string itemType
    +string description
    +decimal quantity
    +decimal unitPrice
}

class Review {
    +UUID id
    +int quality
    +int punctuality
    +int communication
}

class Complaint {
    +UUID id
    +string complaintType
    +string status
}

class Warranty {
    +UUID id
    +string warrantyType
    +date startDate
    +date endDate
    +string status
}

class Subscription {
    +UUID id
    +string status
    +datetime startAt
    +datetime expiresAt
}

User "1" --> "0..1" CustomerProfile
User "1" --> "0..1" ProviderProfile

Atoll "1" --> "*" Island
Island "1" --> "*" IslandAlias

ProviderProfile "1" --> "*" ProviderLocation
ProviderLocation "*" --> "1" Island

ProviderProfile "1" --> "*" ProviderServiceArea
ProviderServiceArea "*" --> "1" Island

ProviderProfile "*" --> "*" RepairService
ProviderProfile "1" --> "0..*" Subscription

CustomerProfile "1" --> "*" RepairRequest
RepairRequest "*" --> "1" RepairService
RepairRequest "*" --> "1" Island : service island

RepairRequest "1" --> "*" MatchingAttempt
RepairRequest "1" --> "*" RepairLead
RepairLead "*" --> "1" ProviderProfile

RepairRequest "1" --> "0..*" RepairAssignment
RepairAssignment "*" --> "1" ProviderProfile

RepairRequest "1" --> "0..1" RepairJob
RepairJob "1" --> "0..*" Inspection
RepairJob "1" --> "0..1" Quotation
Quotation "1" --> "1..*" QuotationVersion
QuotationVersion "1" --> "*" QuotationItem

RepairJob "1" --> "0..1" Review
RepairJob "1" --> "0..*" Complaint
RepairJob "1" --> "0..*" Warranty
```

### Key domain rules

- `Island.id` is the authoritative geographic key; island names are not used for equality matching.
- `ProviderLocation` distinguishes registered address, operational base, branch and temporary base.
- `ProviderServiceArea` represents explicitly supported islands.
- `MatchingAttempt` records each geographic expansion/matching decision.
- A repair request may have multiple leads/assignment attempts but only one active exclusive assignment where exclusivity applies.
- Quotation revisions are versioned.

---

# 5. UML-03 — Customer Repair Activity Diagram

```mermaid
flowchart TD
    A[Customer Login] --> B[Select Canonical Island]
    B --> C[Select Repair Service]

    C --> D{Service Workflow Type}

    D -->|FIXED_PRICE| E[View Fixed Price]
    D -->|DIAGNOSIS_REQUIRED| F[Describe Problem / Add Media]

    E --> G{Booking Method}
    F --> G

    G -->|Direct Provider| H[Select Eligible Provider]
    G -->|Smart Matching| I[Submit for Smart Matching]

    H --> J[Provider Receives Request]
    I --> K[Local-First Matching Engine]
    K --> J

    J --> L{Provider Accepts?}

    L -->|No| M[Decline / Timeout Handling]
    M --> N{Direct Booking?}
    N -->|Yes| O[Ask Customer: Choose Another / Smart Match / Cancel]
    O --> G
    N -->|No| K

    L -->|Yes| P[Assignment / Job Created]

    P --> Q{Diagnosis Required?}

    Q -->|Yes| R[Inspection]
    R --> S[Diagnosis]
    S --> T[Quotation]
    T --> U{Customer Approves Current Version?}

    U -->|No| V[Reject / Revise / Cancel]
    V --> T
    U -->|Yes| W[Repair]

    Q -->|No| W

    W --> X[Repair Completed]
    X --> Y[Customer Confirmation]

    Y -->|Problem| Z[Dispute / Complaint]
    Y -->|Confirmed| AA[Finalize Job]

    AA --> AB[Review / Warranty]
```

### Activity rule

The quotation path is mandatory for `DIAGNOSIS_REQUIRED` services before charge-changing repair work proceeds. `FIXED_PRICE` services may move directly to scheduled service unless additional work requires customer reauthorization.

---

# 6. UML-04 — Local Island Matching Activity Diagram

```mermaid
flowchart TD
    A[Repair Request Submitted] --> B[Resolve Canonical service_island_id]
    B --> C[Resolve service_atoll_id + repair_service_id]
    C --> D[Validate Island Active / Serviceable]
    D --> E[Apply Account + Verification + Subscription + Service + Availability Rules]

    E --> F[Search Tier 0]
    F --> G{Eligible Provider Physically Based on Same Island?}

    G -->|Yes| H[Rank Tier 0 Providers]
    H --> I[Offer / Assign]

    G -->|No| J[Search Tier 1]
    J --> K{Provider Explicitly Approved to Serve Target Island?}

    K -->|Yes| L[Rank Tier 1 Providers]
    L --> I

    K -->|No| M{Same-Atoll Fallback Allowed?}

    M -->|Yes| N[Search Tier 2 Same-Atoll Providers]
    N --> O{Eligible / Available Provider Found?}
    O -->|Yes| P[Disclose / Apply Cross-Island Dispatch Rules]
    P --> I

    O -->|No| Q{Cross-Atoll / Special Dispatch Allowed?}
    M -->|No| Q

    Q -->|Yes| R[Search Tier 3 / Admin Authorization]
    R --> S{Provider Authorized?}
    S -->|Yes| I
    S -->|No| T[No Provider in Allowed Scope]

    Q -->|No| T

    I --> U[Record Matching Attempt + Algorithm Version]
    T --> U
```

### Geographic tiers

- **Tier 0:** active operational base on exact target island.
- **Tier 1:** provider based elsewhere but explicitly approved to service the target island.
- **Tier 2:** same-atoll cross-island fallback where policy and provider travel eligibility permit.
- **Tier 3:** cross-atoll / special dispatch under explicit policy or administrative authorization.

The engine must never silently broaden geography.

---

# 7. UML-05 — Smart Matching Sequence Diagram

```mermaid
sequenceDiagram
    actor C as Customer
    participant UI as iFixIt Web App
    participant API as API Layer
    participant DB as PostgreSQL
    participant ME as Matching Engine
    participant P as Provider
    participant N as Notification Service

    C->>UI: Submit repair request
    UI->>API: POST /repair-requests
    API->>DB: Validate service + canonical island/atoll
    DB-->>API: Valid

    API->>DB: Create repair request
    API->>ME: Match request

    ME->>DB: Load provider eligibility candidates
    ME->>DB: Load operational bases + service areas

    ME->>ME: Classify Tier 0 / Tier 1 / Tier 2 / Tier 3
    ME->>ME: Apply matching scope and rank allowed tier

    ME->>DB: Create matching_attempt
    ME->>DB: Create repair lead
    ME->>N: Notify selected/provider pool

    N-->>P: New repair request

    P->>API: Accept request
    API->>DB: Recheck provider eligibility + assignment concurrency

    alt Eligible and assignment available
        API->>DB: Create exclusive assignment
        API->>DB: Create repair job
        API->>N: Notify customer
        N-->>C: Provider assigned
    else Provider no longer eligible / race lost
        API->>ME: Continue/restart matching
        ME->>DB: Record new matching attempt
    end
```

### Sequence controls

Provider eligibility must be rechecked at acceptance time. Exclusive assignment must be concurrency-safe so multiple providers cannot own the same exclusive job.

---

# 8. UML-06 — Direct Provider Booking Sequence Diagram

```mermaid
sequenceDiagram
    actor C as Customer
    participant UI as iFixIt Web App
    participant API as API Layer
    participant DB as PostgreSQL
    participant P as Selected Provider
    participant N as Notification Service
    participant M as Matching Engine

    C->>UI: Select provider + service
    UI->>API: Create direct-provider request

    API->>DB: Validate exact service
    API->>DB: Validate target canonical island
    API->>DB: Check provider approval / suspension / subscription
    API->>DB: Check operational/service-area eligibility

    alt Provider eligible
        API->>DB: Create direct lead
        API->>N: Notify selected provider
        N-->>P: Direct repair request

        P->>API: Accept / Decline

        alt Accept
            API->>DB: Recheck eligibility + concurrency
            API->>DB: Create assignment
            API->>DB: Create job
            API-->>C: Booking accepted
        else Decline or Timeout
            API-->>C: Selected provider unavailable
            C->>API: Choose another OR convert to Smart Matching OR cancel
            alt Convert to Smart Matching
                API->>M: Start local-first smart matching
            end
        end
    else Provider not eligible
        API-->>C: Provider unavailable for requested service/location
    end
```

### Direct-booking rule

A direct booking must never be silently redistributed to another provider. Customer consent is required before conversion to Smart Matching.

---

# 9. UML-07 — Repair Job State Diagram

```mermaid
stateDiagram-v2
    [*] --> ASSIGNED

    ASSIGNED --> ACCEPTED
    ASSIGNED --> CANCELLED

    ACCEPTED --> INSPECTION_SCHEDULED: Diagnosis required
    ACCEPTED --> REPAIR_SCHEDULED: Fixed-price service

    INSPECTION_SCHEDULED --> INSPECTED
    INSPECTION_SCHEDULED --> CANCELLED

    INSPECTED --> QUOTE_PENDING

    QUOTE_PENDING --> QUOTE_APPROVED
    QUOTE_PENDING --> CANCELLED

    QUOTE_APPROVED --> REPAIR_SCHEDULED

    REPAIR_SCHEDULED --> IN_PROGRESS

    IN_PROGRESS --> WAITING_FOR_PARTS
    WAITING_FOR_PARTS --> IN_PROGRESS

    IN_PROGRESS --> ON_HOLD
    ON_HOLD --> IN_PROGRESS

    IN_PROGRESS --> REPAIR_COMPLETED
    IN_PROGRESS --> UNABLE_TO_REPAIR

    REPAIR_COMPLETED --> CUSTOMER_CONFIRMATION

    CUSTOMER_CONFIRMATION --> FINALIZED
    CUSTOMER_CONFIRMATION --> DISPUTED

    DISPUTED --> FINALIZED
    DISPUTED --> CANCELLED

    FINALIZED --> [*]
    CANCELLED --> [*]
    UNABLE_TO_REPAIR --> [*]
```

### State rule

State changes must be validated server-side and stored in immutable/history records. Admin state corrections require elevated permission, reason and audit entry.

---

# 10. UML-08 — Component / Architecture Diagram

```mermaid
flowchart TB

    subgraph Clients
        PUBLIC[Public Marketplace]
        CUSTOMER[Customer Portal]
        PROVIDER[Provider Portal]
        ADMIN[Admin Portal]
    end

    subgraph Backend["iFixIt Modular Monolith / API"]
        AUTH[Authentication]
        CUST[Customer Module]
        PROV[Provider Module]
        VERIFY[Verification Module]
        CAT[Repair Catalogue]
        LOC[Atoll / Island Location Module]
        MATCH[Local-First Matching Engine]
        REQUEST[Repair Request Module]
        ASSIGN[Lead / Assignment Module]
        JOB[Job Module]
        INSPECT[Inspection Module]
        QUOTE[Quotation Module]
        PARTS[Parts / Labour Module]
        WARRANTY[Warranty Module]
        REVIEW[Review Module]
        COMPLAINT[Complaint Module]
        SUB[Subscription Module]
        PAYMENTS[Subscription Payment Module]
        NOTIFY[Notification Module]
        REPORT[Reporting / Supply-Demand Analytics]
        AUDIT[Audit Module]
    end

    DB[(PostgreSQL)]
    STORAGE[(Private Object Storage)]
    QUEUE[(Background Job Queue)]

    OTP[OTP / SMS]
    EMAIL[Email]
    WA[WhatsApp]
    GATEWAY[Payment Gateway]
    MONITOR[Monitoring / Alerting]

    PUBLIC --> CAT
    PUBLIC --> LOC
    PUBLIC --> PROV

    CUSTOMER --> AUTH
    CUSTOMER --> CUST
    CUSTOMER --> REQUEST
    CUSTOMER --> QUOTE

    PROVIDER --> AUTH
    PROVIDER --> PROV
    PROVIDER --> ASSIGN
    PROVIDER --> JOB
    PROVIDER --> INSPECT
    PROVIDER --> QUOTE

    ADMIN --> AUTH
    ADMIN --> VERIFY
    ADMIN --> LOC
    ADMIN --> ASSIGN
    ADMIN --> COMPLAINT
    ADMIN --> SUB
    ADMIN --> REPORT
    ADMIN --> AUDIT

    REQUEST --> LOC
    REQUEST --> MATCH
    MATCH --> PROV
    MATCH --> LOC
    MATCH --> ASSIGN

    ASSIGN --> JOB
    JOB --> INSPECT
    INSPECT --> QUOTE
    JOB --> PARTS
    JOB --> WARRANTY
    JOB --> REVIEW
    JOB --> COMPLAINT

    AUTH --> DB
    CUST --> DB
    PROV --> DB
    VERIFY --> DB
    CAT --> DB
    LOC --> DB
    MATCH --> DB
    REQUEST --> DB
    ASSIGN --> DB
    JOB --> DB
    INSPECT --> DB
    QUOTE --> DB
    SUB --> DB
    REPORT --> DB
    AUDIT --> DB

    REQUEST --> STORAGE
    INSPECT --> STORAGE
    VERIFY --> STORAGE
    COMPLAINT --> STORAGE

    NOTIFY --> QUEUE
    QUEUE --> OTP
    QUEUE --> EMAIL
    QUEUE --> WA

    SUB --> PAYMENTS
    PAYMENTS --> GATEWAY

    Backend --> AUDIT
    Backend --> MONITOR
```

### Architecture interpretation

The deployment baseline remains a modular monolith with clear business-module boundaries. PostgreSQL is the system-of-record database, private object storage holds media/documents, background jobs handle asynchronous work, and external providers supply OTP, notifications and subscription payments.

---

# 11. Traceability to Approved Requirements

| UML Diagram | Primary Requirement Sources |
|---|---|
| System Use Case | Steps 1, 3, 8 |
| Domain Class | Step 6 + Local Island Matching architecture |
| Customer Repair Activity | MVP Scope Freeze + Steps 3, 5, 9 |
| Island Matching Activity | Local Island Matching architecture |
| Smart Matching Sequence | MVP Scope Freeze + Local Matching + Step 7 |
| Direct Booking Sequence | MVP Scope Freeze + Step 7 |
| Job State Diagram | Step 9 |
| Component Architecture | Steps 1, 2, 7 + Local Matching architecture |

---

# 12. Developer Rules Derived from UML

1. Frontend state must never be treated as authoritative for permissions, assignment, provider eligibility, quotation approval or job status.
2. Canonical IDs are required for atoll/island matching; free-text names are display/search aids only.
3. Same-island operational-base providers are evaluated before broader geographic fallbacks.
4. Direct Provider Booking and Smart Matching are distinct flows.
5. Direct bookings require customer consent before broadening into Smart Matching.
6. `FIXED_PRICE` and `DIAGNOSIS_REQUIRED` services have different workflow paths.
7. Quotations are versioned and approval applies to a specific/current version.
8. Exclusive provider assignment must be concurrency-safe.
9. Matching-stage expansion must be auditable.
10. Job state transitions must use the formal transition matrix and history records.
11. Customer repair settlement remains outside MVP; payment-gateway integration is for provider subscription payments unless scope is later changed.
12. Media and verification documents must use private/authorized storage rules.

---

# 13. UML Change-Control Rule

Any future functional change that affects actors, entity relationships, workflow routing, matching logic, state transitions or component boundaries must trigger review of this UML document.

Examples:
- adding customer in-platform repair payment
- adding provider business staff/team dispatch
- changing same-island fallback behavior
- adding multi-provider bidding
- changing quotation authorization rules
- introducing AI-assisted assignment

The UML should remain synchronized with the implementation baseline rather than becoming a historical drawing only.

---

# 14. Approval Checklist

- [x] System actors represented
- [x] Direct Provider Booking represented
- [x] Smart Matching represented
- [x] FIXED_PRICE workflow represented
- [x] DIAGNOSIS_REQUIRED workflow represented
- [x] Canonical island model represented
- [x] Same-island Tier 0 priority represented
- [x] Tier 1 / same-atoll / cross-atoll fallback represented
- [x] Matching audit object represented
- [x] Repair request, lead, assignment and job represented
- [x] Inspection and quotation flows represented
- [x] Job state lifecycle represented
- [x] Core component architecture represented
- [x] Provider subscription/payment boundary represented

**Decision:** This UML package is part of the iFixIt pre-coding implementation blueprint and must be reviewed whenever the authoritative functional or architecture documents change.
