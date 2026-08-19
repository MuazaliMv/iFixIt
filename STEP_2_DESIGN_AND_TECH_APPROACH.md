# Step 2: Choose Your Design & Tech Approach

## iFixIt

**Document status:** Design and technology baseline  
**Purpose:** Define how iFixIt should look, how users navigate it, and how the project should be structured before production coding begins.

---

# 1. Decision Summary

For iFixIt, the recommended approach is to complete **both** parts of Step 2 in this order:

1. **Visual wireframing first** — freeze the main customer, technician/provider, and admin experience.
2. **Project structure second** — define the application folders, modules, routes, shared components, backend boundaries, and environment structure.
3. **Only after approval** should production feature coding begin.

This avoids designing the database, APIs, and pages around assumptions that later change.

---

# 2. Recommended Product Form

iFixIt should begin as a **responsive mobile-first web application**.

### Customer experience
- Mobile-first
- Very simple navigation
- Fast service search
- Clear repair status tracking
- Minimal technical terminology

### Technician/provider experience
- Mobile-first operational dashboard
- Fast access to new jobs
- Large action buttons for field use
- Simple job-status updates
- Easy photo upload and quotation creation

### Admin experience
- Desktop-first
- Responsive down to tablet/mobile
- Sidebar navigation
- Tables, filters, dashboards, audit views

---

# 3. Visual Design Direction

The visual direction should communicate:

- trust
- repair expertise
- speed
- clarity
- local availability
- safety

## Recommended style

Use a clean service-platform design rather than a complicated marketplace layout.

### Visual characteristics
- light background
- strong contrast
- large touch targets
- rounded cards
- simple icons
- minimal decorative effects
- clear status badges
- prominent repair actions

### Semantic UI states

The design system should visually distinguish:

- **Active / Completed / Approved**
- **Pending / Waiting / Attention Required**
- **Failed / Rejected / Suspended**
- **Informational / Scheduled**

Status must always include text and must not rely only on color.

---

# 4. Core Design System

## Typography

Recommended hierarchy:

- Display: 32–40px
- H1: 28–32px
- H2: 22–24px
- H3: 18–20px
- Body: 15–16px
- Small text: 13–14px
- Caption: 12px

Use one modern, highly readable sans-serif font.

## Spacing

Use an 8-point spacing system:

- 4px
- 8px
- 12px
- 16px
- 24px
- 32px
- 40px
- 48px
- 64px

## Touch targets

Primary interactive elements should be approximately **44px × 44px minimum** where practical.

## Cards

Cards should be used for:

- providers
- repair requests
- active jobs
- quotations
- status summaries
- subscriptions
- notifications

## Buttons

Button types:

- Primary
- Secondary
- Tertiary/Text
- Destructive
- Icon button

Examples:

**Primary:**
- Find a Repair Technician
- Submit Repair Request
- Accept Job
- Approve Quote
- Mark Repair Complete

**Destructive:**
- Cancel Request
- Reject Quote
- Suspend Technician

---

# 5. Responsive Layout Rules

## Mobile

Primary width:
- 360px–430px

Layout:
- single column
- bottom navigation
- stacked cards
- full-width primary CTAs
- filters in drawer/bottom sheet

## Tablet

Layout:
- one/two columns
- wider margins
- optional side navigation

## Desktop

Layout:
- wider content containers
- multi-column dashboards
- tables for admin
- permanent sidebar where useful

Recommended breakpoints:

- XS: 0–359px
- SM: 360–639px
- MD: 640–767px
- LG: 768–1023px
- XL: 1024–1279px
- 2XL: 1280px+

---

# 6. Customer Navigation

## Mobile bottom navigation

1. Home
2. Search
3. Repairs
4. Saved
5. Account

## Customer account menu

- Profile
- Repair Requests
- Jobs
- Quotations
- Reviews
- Complaints
- Warranties
- Notifications
- Settings
- Logout

---

# 7. Technician / Provider Navigation

## Mobile bottom navigation

1. Dashboard
2. Requests
3. Jobs
4. Availability
5. Profile

## Provider menu

- Verification
- Services
- Service Areas
- Pricing
- Availability
- Requests / Leads
- Jobs
- Quotations
- Reviews
- Warranty
- Subscription
- Payments
- Notifications
- Settings

---

# 8. Admin Navigation

Recommended desktop sidebar:

- Dashboard
- Customers
- Technicians
- Verification
- Repair Services
- Locations
- Repair Requests
- Assignments
- Jobs
- Quotations
- Parts / Labour Records
- Warranties
- Complaints
- Reviews
- Subscriptions
- Payments
- Notifications
- Reports
- Audit Logs
- Configuration

---

# 9. Customer Home Screen Wireframe

```text
┌────────────────────────────────┐
│ iFixIt                  Account│
├────────────────────────────────┤
│ What do you need repaired?     │
│                                │
│ [📍 Hulhumalé              ▼]  │
│ [🔎 Search repair services...] │
│                                │
│ [ Find a Technician ]          │
├────────────────────────────────┤
│ Popular Repair Services        │
│                                │
│ [ AC Repair ] [ Plumbing ]     │
│ [ Electrical] [ Appliances ]   │
│ [ CCTV      ] [ Door & Lock ]  │
├────────────────────────────────┤
│ Active Repair                  │
│ IFX-2026-001245                │
│ AC Not Cooling                 │
│ Inspection Scheduled           │
│ [Track Repair]                 │
├────────────────────────────────┤
│ Recommended Technicians        │
│ [ Provider Card ]              │
│ [ Provider Card ]              │
├────────────────────────────────┤
│ Home Search Repairs Saved Me   │
└────────────────────────────────┘
```

---

# 10. Provider Search Results Wireframe

```text
┌────────────────────────────────┐
│ ← AC Not Cooling               │
│ 📍 Hulhumalé                   │
├────────────────────────────────┤
│ [Filters] [Sort: Recommended]  │
├────────────────────────────────┤
│                                │
│ Ahmed AC Services       ✓      │
│ ★ 4.8 (86)                     │
│ Available Today                │
│ Starting from MVR 350          │
│                                │
│ [View Profile]                 │
│ [Request Repair] [WhatsApp]    │
│                                │
├────────────────────────────────┤
│ Another Provider ...           │
└────────────────────────────────┘
```

### Search filters

- availability
- verified only
- rating
- provider type
- price range
- years of experience

Eligibility remains server-authoritative.

---

# 11. Provider Profile Wireframe

```text
┌────────────────────────────────┐
│ ← Ahmed AC Services      Share │
├────────────────────────────────┤
│ [Provider Photo]               │
│ Ahmed AC Services              │
│ ✓ Identity Verified            │
│ ★ 4.8 · 86 reviews             │
│ Available Today                │
│                                │
│ [ Request Repair ]             │
│ [ WhatsApp ] [ Call ]          │
├────────────────────────────────┤
│ About                          │
│ Experienced AC technician...   │
├────────────────────────────────┤
│ Services                       │
│ AC Not Cooling      From 350   │
│ AC Water Leak       From 300   │
│ AC Installation     Quote Req. │
├────────────────────────────────┤
│ Service Areas                  │
│ Hulhumalé · Malé               │
├────────────────────────────────┤
│ Work Gallery                   │
│ [IMG] [IMG] [IMG]              │
├────────────────────────────────┤
│ Reviews                        │
│ [Review] [Review]              │
└────────────────────────────────┘
```

---

# 12. Create Repair Request Wireframe

Use a multi-step flow.

## Step 1 — Repair

- exact service
- item/equipment type
- brand
- model

## Step 2 — Problem

- description
- photos
- optional video later

## Step 3 — Location

- island/city
- address/building
- access notes

## Step 4 — Schedule

- urgency
- preferred date
- preferred time

## Step 5 — Review

Display all entered information.

```text
Repair: AC Not Cooling
Brand: Panasonic
Location: Hulhumalé
Urgency: Today
Photos: 2

[Edit]

[ Submit Repair Request ]
```

On success:

```text
Repair Request Submitted

Ticket: IFX-2026-001245

[Track Repair]
```

---

# 13. Customer Repair Tracking Dashboard

This is one of the most important screens in iFixIt.

```text
┌────────────────────────────────┐
│ Repair IFX-2026-001245         │
├────────────────────────────────┤
│ AC Not Cooling                 │
│ Ahmed AC Services              │
│                                │
│ Current Status                 │
│ INSPECTION SCHEDULED           │
│                                │
│ 20 Aug 2026 · 3:00–5:00 PM    │
├────────────────────────────────┤
│ Progress                       │
│                                │
│ ✓ Request Submitted            │
│ ✓ Technician Assigned          │
│ ✓ Technician Accepted          │
│ ● Inspection Scheduled         │
│ ○ Inspection Completed         │
│ ○ Quotation                    │
│ ○ Repair                       │
│ ○ Completion                   │
├────────────────────────────────┤
│ Technician                     │
│ Ahmed AC Services              │
│ [WhatsApp] [Call]              │
├────────────────────────────────┤
│ [View Request Details]         │
└────────────────────────────────┘
```

State-specific actions:

### Before assignment
- Cancel Request

### Inspection scheduled
- Contact Technician
- Request Reschedule where allowed

### Quote received
- View Quote
- Approve
- Reject

### In repair
- Track Progress
- Contact Technician
- Report Issue

### Completed
- Confirm Completion
- Report Problem

### Finalized
- Leave Review
- View Warranty

---

# 14. Quotation Screen

```text
Repair Quotation
IFX-2026-001245

Technician: Ahmed AC Services

Diagnosis
Faulty AC capacitor

Items
--------------------------------
AC Capacitor      1 × MVR 250
Labour                MVR 350
--------------------------------
TOTAL                 MVR 600

Estimated repair time: 2 hours
Quote valid until: 21 Aug 2026

[ Reject Quote ] [ Approve Quote ]
```

Approved quotation becomes the baseline repair authorization.

---

# 15. Technician Dashboard Wireframe

```text
┌────────────────────────────────┐
│ Good afternoon, Ahmed      Bell│
├────────────────────────────────┤
│ Availability                   │
│ [ Available Today          ▼]  │
├────────────────────────────────┤
│ New Requests     Active Jobs   │
│      8                3        │
│                                │
│ Quotes Pending    Rating       │
│      2             4.8 ★       │
├────────────────────────────────┤
│ New Requests                   │
│                                │
│ AC Not Cooling                 │
│ Hulhumalé · Today              │
│ Posted 12 min ago              │
│ [View Request]                 │
├────────────────────────────────┤
│ Today's Jobs                   │
│ [Job Card]                     │
├────────────────────────────────┤
│ Subscription                   │
│ Professional · Active          │
│ Expires 24 Aug                 │
│ [Manage]                       │
├────────────────────────────────┤
│ Dash Requests Jobs Avail Prof  │
└────────────────────────────────┘
```

---

# 16. Technician Incoming Request Screen

```text
AC Not Cooling
NEW REQUEST

Location
Hulhumalé

Urgency
Today

Customer description
"AC is running but not cooling..."

Photos
[IMG] [IMG]

Preferred time
4:00–6:00 PM

[ Decline ] [ Accept Job ]
```

Acceptance must be revalidated server-side.

---

# 17. Technician Job Screen

```text
Repair IFX-2026-001245

Customer
[Display-safe customer name]
[Call] [WhatsApp]

Service
AC Not Cooling

Status
INSPECTION SCHEDULED

Schedule
20 Aug · 4:00 PM

Timeline
✓ Accepted
● Inspection Scheduled
○ Inspected
○ Quote
○ Repair
○ Completed

[ Start Inspection ]
```

Available actions depend on job state.

---

# 18. Technician Inspection Screen

Fields:

- diagnosis
- issue found
- recommended repair
- inspection notes
- inspection photos
- parts required
- labour estimate
- repair-time estimate

Primary action:

**Create Quotation**

---

# 19. Technician Quotation Builder

```text
Create Quotation

Diagnosis
[Faulty capacitor...]

Parts
[+ Add Part]

Part: AC Capacitor
Qty: 1
Unit Price: MVR 250

Labour
[+ Add Labour]

Description: Replacement labour
Amount: MVR 350

--------------------------------
Total: MVR 600
--------------------------------

Estimated Time
[2 hours]

Quote Expiry
[21 Aug 2026]

[Save Draft]
[Submit Quote]
```

---

# 20. Technician Repair Progress Screen

Technician should be able to update:

- Repair Scheduled
- In Progress
- Waiting for Parts
- On Hold
- Repair Completed
- Unable to Repair

When marking complete, require:

- completion notes
- final parts used
- final labour
- final images where applicable
- warranty information

---

# 21. Technician Subscription Screen

```text
Professional Plan
ACTIVE

Expires
24 August 2026

Features
✓ Marketplace listing
✓ Repair requests
✓ Reviews
✓ Business dashboard

[ Renew Subscription ]

Payment History
[View]
```

If expired:

- historical jobs remain accessible
- renewal remains available
- new search visibility disabled
- new assignments disabled

---

# 22. Admin Dashboard Wireframe

```text
┌──────────────┬────────────────────────────────────────┐
│ iFixIt Admin │ Dashboard             Bell   Admin    │
├──────────────┼────────────────────────────────────────┤
│ Dashboard    │ Pending Verification   12            │
│ Customers    │ Unassigned Repairs      8            │
│ Technicians  │ Active Repairs         43            │
│ Verification │ Open Complaints         3            │
│ Services     │                                        │
│ Locations    │ Action Required                        │
│ Requests     │ • 12 technicians need review          │
│ Jobs         │ • 4 payments need review              │
│ Quotations   │ • 3 priority complaints               │
│ Warranty     │                                        │
│ Complaints   │ Marketplace / Repair Charts           │
│ Subscriptions│                                        │
│ Payments     │ Recent Activity                       │
│ Reports      │                                        │
│ Audit        │                                        │
│ Settings     │                                        │
└──────────────┴────────────────────────────────────────┘
```

---

# 23. Admin Technician Detail

Tabs:

- Overview
- Verification
- Services
- Service Areas
- Jobs
- Quotations
- Subscription
- Payments
- Reviews
- Complaints
- Audit

Primary admin actions:

- Approve
- Request Information
- Reject
- Suspend
- Reactivate

Each privileged action requires permission validation and audit logging.

---

# 24. Admin Repair Detail

Admin should see the complete repair lifecycle:

- ticket ID
- customer
- technician
- service
- location
- issue description
- attachments
- assignment history
- inspection
- quotation
- status history
- parts
- labour
- completion
- warranty
- complaint/dispute

Admin actions where permitted:

- assign technician
- reassign technician
- investigate
- correct state with reason
- resolve dispute

---

# 25. Loading, Empty and Error States

Every screen must define these states.

## Loading

Use skeletons for:
- provider cards
- dashboards
- repair tracking
- tables

## Empty

Example provider requests:

> No new repair requests yet. Keep your availability and services updated.

Example customer repairs:

> You have no active repairs.

Primary CTA:

**Request a Repair**

## Error

Page-level:

> We couldn't load this page.

Buttons:
- Retry
- Go Home

Field-level:
- show error immediately below field
- preserve all other entered data

---

# 26. Project Technology Approach

The recommended technical approach is a **modular monolith**.

```text
Responsive Web App
        ↓
Server/API Layer
        ↓
Domain Services
        ↓
PostgreSQL + Object Storage
        ↓
External Integrations
```

This is preferred over microservices for the first production version because it provides:

- simpler development
- easier deployment
- easier transactions
- lower operational cost
- simpler debugging
- easier testing
- clear path to later extraction if scale requires it

---

# 27. Recommended Technology Stack

The exact vendor can still be frozen later, but the recommended stack pattern is:

## Frontend / Application

- TypeScript
- React-based framework
- Next.js-style server/client routing approach
- Responsive CSS system
- reusable design-system components

## Backend

- TypeScript server/API modules
- REST JSON endpoints for primary API contract
- server-side authorization
- centralized domain services

## Database

- PostgreSQL-compatible relational database

## File Storage

Managed object storage for:

- technician profile images
- verification documents
- repair request photos
- inspection images
- completion images
- complaint evidence

## Authentication

Managed authentication with approved OTP/session model.

## Payments

External payment gateway behind a payment adapter.

## Notifications

Adapters for:

- SMS/OTP
- Email
- WhatsApp/deep-link or API where approved
- In-app notifications

## Background processing

Managed background job/queue capability for:

- notifications
- retries
- payment reconciliation
- expiry processing
- media processing where required

---

# 28. Recommended Repository Structure

Do **not** use a simple `index.html + css + backend-script` structure for the production platform.

That structure is acceptable only for a static prototype.

For the real iFixIt application, use a scalable application structure similar to:

```text
ifixit/
│
├── app/
│   ├── (public)/
│   │   ├── page.tsx
│   │   ├── services/
│   │   ├── search/
│   │   ├── providers/
│   │   └── become-a-provider/
│   │
│   ├── (auth)/
│   │   ├── login/
│   │   └── verify/
│   │
│   ├── (customer)/
│   │   ├── account/
│   │   ├── repairs/
│   │   ├── jobs/
│   │   ├── quotations/
│   │   ├── warranties/
│   │   ├── complaints/
│   │   └── settings/
│   │
│   ├── provider/
│   │   ├── dashboard/
│   │   ├── profile/
│   │   ├── verification/
│   │   ├── services/
│   │   ├── areas/
│   │   ├── availability/
│   │   ├── requests/
│   │   ├── jobs/
│   │   ├── quotations/
│   │   ├── warranty/
│   │   ├── subscription/
│   │   ├── payments/
│   │   └── settings/
│   │
│   ├── admin/
│   │   ├── dashboard/
│   │   ├── customers/
│   │   ├── providers/
│   │   ├── verification/
│   │   ├── services/
│   │   ├── locations/
│   │   ├── requests/
│   │   ├── jobs/
│   │   ├── quotations/
│   │   ├── warranties/
│   │   ├── complaints/
│   │   ├── subscriptions/
│   │   ├── payments/
│   │   ├── reports/
│   │   ├── audit/
│   │   └── configuration/
│   │
│   └── api/
│       └── v1/
│
├── components/
│   ├── ui/
│   ├── navigation/
│   ├── providers/
│   ├── repairs/
│   ├── quotations/
│   ├── jobs/
│   ├── reviews/
│   └── admin/
│
├── modules/
│   ├── auth/
│   ├── users/
│   ├── customers/
│   ├── providers/
│   ├── verification/
│   ├── services/
│   ├── locations/
│   ├── marketplace/
│   ├── requests/
│   ├── assignments/
│   ├── inspections/
│   ├── quotations/
│   ├── jobs/
│   ├── parts/
│   ├── warranties/
│   ├── reviews/
│   ├── complaints/
│   ├── subscriptions/
│   ├── payments/
│   ├── notifications/
│   ├── reporting/
│   └── audit/
│
├── lib/
│   ├── db/
│   ├── auth/
│   ├── storage/
│   ├── payments/
│   ├── notifications/
│   ├── validation/
│   └── logging/
│
├── types/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── api/
│   └── e2e/
│
├── public/
├── docs/
├── scripts/
├── migrations/
├── .github/
│   └── workflows/
│
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

# 29. Module Responsibilities

## auth
- OTP/session handling
- login/logout
- role context

## providers
- technician/provider profile
- service preferences
- availability

## verification
- identity/business/qualification verification

## services
- repair catalogue

## locations
- Maldives location hierarchy

## marketplace
- provider eligibility
- search
- ranking

## requests
- customer repair requests

## assignments
- technician matching
- accept/decline
- reassignment

## inspections
- inspection schedule
- diagnosis
- inspection evidence

## quotations
- parts/labour quotation
- customer approval/rejection

## jobs
- repair lifecycle
- status transitions

## warranties
- warranty creation
- claims

## reviews
- verified customer ratings

## complaints
- complaints/disputes

## subscriptions
- provider plan lifecycle

## payments
- payment initiation
- signed webhooks
- reconciliation

## notifications
- in-app/external messages

## reporting
- operational and management reporting

## audit
- privileged action history

---

# 30. Data Flow Architecture

```text
CUSTOMER / TECHNICIAN / ADMIN
            │
            ▼
       Responsive UI
            │
            ▼
        REST/API Layer
            │
            ▼
       Domain Services
            │
    ┌───────┼──────────┐
    ▼       ▼          ▼
PostgreSQL Storage   Job Queue
            │          │
            │          ├─ Notifications
            │          ├─ Retries
            │          └─ Reconciliation
            │
            ├─ OTP Provider
            ├─ Payment Gateway
            ├─ Email/SMS
            └─ WhatsApp Integration
```

---

# 31. Database Direction

The database should be relational and centered around the repair lifecycle.

Core entity families:

```text
users
customer_profiles
provider_profiles
businesses
provider_verification
service_categories
service_subcategories
services
provider_services
locations
provider_service_areas
provider_availability
repair_requests
request_attachments
assignments / leads
inspections
quotations
quotation_items
jobs
job_status_history
job_parts
job_labour
warranties
warranty_claims
reviews
complaints
subscriptions
payments
notifications
audit_events
system_configuration
```

The exact SQL schema should be frozen in a later database-design step.

---

# 32. API Direction

Recommended API prefix:

```text
/api/v1
```

Main endpoint families:

```text
/auth
/services
/locations
/providers
/search
/requests
/assignments
/inspections
/quotations
/jobs
/warranties
/reviews
/complaints
/subscriptions
/payments
/notifications
/admin
/reports
```

The frontend must not implement authoritative business rules that belong to the backend.

---

# 33. Security Direction

Required principles:

- HTTPS/TLS
- secure authentication
- server-side authorization
- least privilege
- admin MFA
- private verification files
- signed access to sensitive files
- upload validation
- rate limiting
- payment webhook signature validation
- idempotency
- audit logging
- input validation
- no secrets in frontend bundle
- no plaintext passwords
- no sensitive tokens in logs

---

# 34. Environment Structure

Create three isolated environments:

```text
Development
    ↓
Staging
    ↓
Production
```

Each must have separate:

- database
- storage
- secrets
- API credentials
- payment credentials
- OTP credentials

Production data must not be used as the normal development database.

---

# 35. Development Sequence After Step 2

Recommended order:

1. Approve Step 2 wireframes and navigation.
2. Freeze the full screen inventory.
3. Freeze database entities and relationships.
4. Freeze API contracts.
5. Freeze role/permission matrix.
6. Create the application scaffold.
7. Create reusable UI components.
8. Build authentication.
9. Build service/location master data.
10. Build customer discovery and requests.
11. Build provider onboarding and operations.
12. Build inspection/quotation/job lifecycle.
13. Build subscription/payment lifecycle.
14. Build admin.
15. Build reports/audit.
16. Run complete functional/security/E2E testing.
17. Deploy staging.
18. Production go-live after acceptance.

---

# 36. Step 2 Approval Checklist

## Design

- [ ] Customer home approved
- [ ] Search results approved
- [ ] Provider profile approved
- [ ] Repair request flow approved
- [ ] Repair tracking dashboard approved
- [ ] Quotation UI approved
- [ ] Provider dashboard approved
- [ ] Provider request/job flow approved
- [ ] Inspection UI approved
- [ ] Provider quotation builder approved
- [ ] Repair progress UI approved
- [ ] Subscription UI approved
- [ ] Admin dashboard approved
- [ ] Admin provider detail approved
- [ ] Admin repair detail approved
- [ ] Loading/empty/error states approved
- [ ] Mobile navigation approved
- [ ] Desktop admin navigation approved

## Technology

- [ ] Responsive web application approved
- [ ] Modular monolith approved
- [ ] TypeScript/React framework direction approved
- [ ] PostgreSQL-compatible database approved
- [ ] Object storage approved
- [ ] REST API direction approved
- [ ] Managed authentication direction approved
- [ ] Payment adapter architecture approved
- [ ] Notification adapter architecture approved
- [ ] Background jobs/queue direction approved
- [ ] Environment isolation approved
- [ ] Repository structure approved

## Final Step 2 Status

- [ ] **STEP 2 APPROVED — READY FOR DETAILED DATABASE/API DESIGN**

---

# 37. Recommended Decision

For iFixIt, **do not jump directly into creating `index.html`, a CSS folder, and a backend script as the production architecture**.

The recommended path is:

```text
Step 1
User Flow & Architecture
        ↓
Step 2
Design + Technology Baseline
        ↓
Step 3
Detailed Database + API + Permissions
        ↓
Step 4
Application Scaffold
        ↓
Production Feature Development
```

This gives iFixIt a structured foundation before code begins and avoids expensive redesign later.
