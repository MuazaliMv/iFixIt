# iFixIt — Step 12: Business Specification Reconciliation

**Document Type:** Business Requirements Reconciliation / Gap Closure  
**Status:** Implementation Guidance Baseline  
**Version:** 1.0  
**Date:** 2026-08-19

---

## 1. Purpose

This document reconciles the comprehensive **Maldives Handyman & Local Services Subscription Platform** business specification with the existing iFixIt requirements and implementation blueprint.

It records requirements that were previously missing or only partially represented, while preserving already-approved iFixIt decisions where the new business specification conflicts with the current baseline.

This document does **not** replace:
- `MVP_BUSINESS_MODEL_AND_SCOPE_FREEZE.md`
- `LOCAL_ISLAND_MATCHING_AND_LOCATION_ARCHITECTURE.md`
- Steps 1–11

Where there is a conflict, the approved MVP and local-island baseline continue to take precedence unless a later explicit decision changes them.

---

## 2. Reconciliation Status Legend

- **ADOPT** — add to the iFixIt blueprint as a supported requirement.
- **ADOPT / CONFIGURABLE** — support in architecture but keep values configurable.
- **PARTIAL / SYNCHRONIZE** — already partly present; downstream specifications must be synchronized.
- **DEFER** — architecture-ready but not required for MVP.
- **NEEDS DECISION** — business choice must be approved before implementation.
- **REJECT / SUPERSEDED** — conflicts with a stronger approved iFixIt rule.

---

## 3. Business & Marketplace Additions

### 3.1 Direct customer contact — ADOPT

Public provider discovery shall support customer actions, subject to privacy/configuration rules:
- Call provider
- Open WhatsApp with a pre-filled service message
- Request Service through iFixIt
- Save provider to favourites
- Report provider/profile issue

Customer browsing may be anonymous. Authentication is required for protected actions such as structured repair requests, reviews, favourites/history where persistence is required.

### 3.2 Customer remains free — CONFIRMED

Customers do not pay a platform subscription in MVP.

Primary monetization remains provider subscription payments.

Customer-to-provider repair settlement remains outside iFixIt MVP.

### 3.3 Featured placement and additional revenue — DEFER / CONFIGURABLE

Architecture should permit later revenue streams:
- featured/sponsored provider placement
- sponsored categories
- additional lead packs
- premium provider analytics
- CRM/business tools
- enterprise accounts
- advertising where approved

Requirements:
- paid placement must be visibly labelled Featured/Sponsored
- commercial ranking must never bypass provider eligibility, verification or geographic rules
- genuine ratings must not be falsified or replaced by sponsorship

Not required for initial MVP unless separately approved.

---

## 4. Maldives Geography Reconciliation

### 4.1 Country scope — ADOPT

MVP country scope is Republic of Maldives (`MV`).

Country selection does not need to be exposed to end users in MVP.

Atolls and islands remain canonical database master data rather than application-code string constants.

### 4.2 Island data — ADOPT

The system should be capable of pre-populating all supported inhabited/serviceable Maldives islands from an authoritative source.

Requirements:
- canonical immutable island IDs
- canonical atoll IDs
- alternative spellings stored only as aliases/search helpers
- marketplace enable/disable/serviceable status
- optional centroid/GPS reference coordinates
- historical records retain island references even after an island is disabled for new work

### 4.3 Urgent vs scheduled geographic behavior — ADOPT / SYNCHRONIZE

The current local-first tier model remains authoritative, with an additional operational distinction:

**Urgent / Now / Today**
- highest priority is provider whose active operational base equals the requested island
- provider must meet the requested-time availability rule
- non-local provider must not be represented as `Available Now` on the target island merely because the island is in a general service-area list

**Scheduled / Future**
- provider may qualify when target island is an approved service area and schedule/travel rules permit
- same-atoll/cross-atoll fallback remains controlled by approved matching scope and dispatch policy

The pasted business specification's absolute same-island-only rule is **SUPERSEDED** by `LOCAL_ISLAND_MATCHING_AND_LOCATION_ARCHITECTURE.md`, which permits controlled, audited fallback.

### 4.4 Travel radius — REJECT AS PRIMARY RULE

Straight-line kilometre radius must not be the authoritative Maldives dispatch rule.

Distance may be a secondary ranking/analytics signal, but canonical island relationships, service-area authorization, transport feasibility, provider willingness, notice and travel terms take precedence.

---

## 5. Provider Account & Verification Additions

### 5.1 Provider profile fields — ADOPT / SYNCHRONIZE

Provider profile architecture should support:
- individual/business account type
- full/public name
- business name where applicable
- representative name where applicable
- profile photo/logo
- description/bio
- years of experience
- languages spoken
- preferred contact method
- exact services
- operational base
- approved service islands
- working hours/availability
- service-specific pricing
- certifications/qualifications
- work gallery

National ID/business verification data belongs in restricted verification/document storage, not public profile fields.

### 5.2 Verification types — ADOPT / CONFIGURABLE

Supported verification/document types may include:
- phone verification
- identity document
- business registration
- trade licence
- qualification/certification
- GST/tax registration where relevant
- police clearance where policy requires it
- insurance certificate where policy requires it

Only authorized admins may approve verification outcomes.

Verification must support expiry/re-review where the underlying document expires.

### 5.3 Verification badges — ADOPT WITH RULES

Public profile/search may display approved badges such as:
- Phone Verified
- Identity Verified
- Business Verified
- Qualification Verified

Experience/trusted badges based on platform metrics are allowed only when generated from objective configured criteria and must not be presented as government certification.

---

## 6. Pricing Model Expansion

### 6.1 Customer-facing pricing models — ADOPT

Every provider-service offering may use one of these pricing presentation models:

- `FIXED`
- `STARTING_FROM`
- `HOURLY`
- `INSPECTION_REQUIRED`
- `QUOTE_REQUIRED`

These are **pricing presentation models** and are distinct from the high-level workflow classification:

- `FIXED_PRICE` workflow
- `DIAGNOSIS_REQUIRED` workflow

Recommended mapping:
- `FIXED` usually maps to `FIXED_PRICE`
- `STARTING_FROM` may map to either workflow depending on what is authorized at booking
- `HOURLY` may map to either workflow depending on service configuration
- `INSPECTION_REQUIRED` maps to `DIAGNOSIS_REQUIRED`
- `QUOTE_REQUIRED` maps to `DIAGNOSIS_REQUIRED`

No pricing label may allow a provider to perform materially charge-changing work beyond customer authorization.

### 6.2 Additional pricing fields — ADOPT / CONFIGURABLE

Architecture may support:
- price amount/minimum
- unit basis
- travel fee
- overtime rate
- weekend rate
- holiday rate
- estimated service duration

These values should be configurable rather than hard-coded.

---

## 7. Provider Availability Expansion

### 7.1 Availability statuses — ADOPT

Provider-facing/customer-facing availability may use:
- `AVAILABLE_NOW`
- `AVAILABLE_TODAY`
- `BY_APPOINTMENT`
- `UNAVAILABLE`

Availability status never bypasses geographic, verification, subscription or service eligibility.

### 7.2 Schedule model — ADOPT

Support:
- recurring weekly working hours
- date-specific overrides
- personal holidays/closures
- public-holiday overrides where configured
- manual real-time availability override
- optional appointment buffer time

### 7.3 Matching availability rule — ADOPT

Urgent matching checks:
- local operational-base eligibility
- current/manual availability
- working-hours/date overrides

Scheduled matching checks:
- operational base or approved service-area eligibility
- requested-date availability
- appointment availability
- travel/notice constraints where applicable

---

## 8. Search & Discovery Expansion

### 8.1 Search filters — ADOPT / CONFIGURABLE

Customer search may support:
- island
- category
- subcategory
- exact service
- availability
- rating threshold
- verification
- account type
- price range
- experience

### 8.2 Sort options — ADOPT / CONFIGURABLE

Potential sort modes:
- Recommended
- Rating
- Review count
- Price
- Experience
- Fine-distance when geographically meaningful

Commercial/featured ranking must remain clearly labelled and must never bypass hard eligibility.

### 8.3 Provider search card — ADOPT

Search cards should be capable of displaying:
- profile photo/logo
- provider/business name
- primary service/specialty
- target service-area summary
- rating/review count
- approved verification badges
- current availability
- relevant starting/fixed price presentation
- View Profile
- Call/WhatsApp where enabled
- Request Service

---

## 9. Lead Generation & Distribution

### 9.1 Lead inbox — ADOPT

Provider dashboard shall support a lead/request inbox showing at minimum:
- service
- target island/location summary
- requested time/urgency
- media count where applicable
- pricing/workflow context
- lead status
- Accept / Decline

### 9.2 Lead statuses — ADOPT / SYNCHRONIZE

Supported lead-level statuses should include equivalents of:
- NEW
- VIEWED
- ACCEPTED
- DECLINED
- EXPIRED
- CANCELLED

`CONTACTED`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED` should primarily be represented in assignment/job lifecycle rather than overloading one lead status where separate entities exist.

### 9.3 Lead timeout — ADOPT AS CONFIGURABLE POLICY

The engine must support configurable response timeout by urgency/service class.

Suggested values from the business specification (15 min urgent, 60 min standard, 24 h scheduled) are **not frozen production constants** until approved through operational testing.

### 9.4 Lead distribution method — NEEDS DECISION

Architecture may support:
- broadcast/pool offers
- progressive ranked offers
- round-robin/fairness routing
- priority routing

AI routing is deferred to later phase.

The distribution mode must remain auditable and concurrency-safe.

---

## 10. Subscription Entitlements

### 10.1 Subscription plans — ADOPT AS CONFIGURABLE PRODUCT MODEL

The system shall support multiple provider subscription plans with configurable:
- name
- monthly/term pricing
- billing duration
- allowed service-area count
- allowed category/service limits
- media/gallery limits
- lead entitlement/limit where used
- analytics level
- featured/priority entitlement where later enabled
- team/staff entitlement where later enabled
- support level

Starter/Professional/Business are valid initial plan names but must be database-configured, not hard-coded.

### 10.2 Exact sample prices — NEEDS DECISION

MVR 99–149 / 249–299 / 499+ and the sample term discounts are business proposals only.

They must not be treated as final prices until commercially approved.

### 10.3 Lead limits — NEEDS DECISION

Plan-level lead limits are supported by architecture, but whether MVP actually limits leads by plan requires explicit approval.

### 10.4 Renewal reminders — ADOPT / CONFIGURABLE

System should support configurable reminders before expiry and grace-period rules.

Sample 7/3/1-day reminders and 3–5 day grace are defaults for validation, not immutable constants.

---

## 11. Detailed Service Catalogue

### 11.1 Catalogue domains — ADOPT AS SEED-DATA REQUIREMENT

The service master should be able to seed and manage at least these household/local-service categories:
- AC Services
- Plumbing
- Electrical
- Carpentry
- Painting
- Appliance Installation & Repair
- CCTV / Networking / Wi-Fi
- Door & Lock Services
- Aluminium & Glass
- Furniture Assembly
- Water Pump & Tank Maintenance
- General Handyman
- Cleaning
- Moving / Loading
- Small Renovation

### 11.2 Exact service examples — ADOPT AS INITIAL MASTER-DATA CANDIDATES

The detailed service lists in the business specification are to be treated as initial catalogue seed candidates rather than immutable application code.

Admin must be able to create, edit, activate, deactivate and archive categories/subcategories/services through master data.

### 11.3 Future category expansion — DEFER

Architecture should allow future categories including:
- pest control
- landscaping
- waterproofing/roofing/flooring
- marine services
- hospitality maintenance
- business/IT/POS/signage services

These are later-phase catalogue scope.

---

## 12. Customer Account Additions

### 12.1 Favourites — ADOPT

Authenticated customers may save/unsave public providers.

### 12.2 Saved/default locations — ADOPT

Customer profile may store default island and optional saved address/location records.

### 12.3 Service history — CONFIRMED / SYNCHRONIZE

Customer can access own requests/jobs/quotes/completions/complaints/warranties/history according to permissions.

### 12.4 Review edit/delete windows — NEEDS DECISION

The suggested 30-day edit and 7-day deletion windows are not yet frozen.

Review version/moderation history must be preserved where required for trust/audit.

---

## 13. Communication Additions

### 13.1 WhatsApp deep link — ADOPT

Where provider permits public WhatsApp contact, iFixIt may generate a pre-filled message using safe customer/service context.

Example structure:

`I found your profile on iFixIt. I need help with <service> in <island>. Preferred date/time: ...`

Private information should not be inserted into URLs/messages unnecessarily.

### 13.2 Phone call deep link — ADOPT

One-tap calling may be exposed where provider contact visibility settings allow it.

### 13.3 In-platform chat — DEFER / ARCHITECTURE-READY

Structured notifications and external contact are sufficient for MVP unless full messaging is explicitly approved.

---

## 14. Provider Dashboard Metrics

### 14.1 Provider KPI set — ADOPT AS REPORTING REQUIREMENTS

Provider dashboard/reporting should support, when enough data exists:
- new enquiries
- jobs this month
- average rating
- profile views
- response rate
- acceptance rate
- completion rate
- average response time
- recorded job value/revenue estimate where provider enters job value
- subscription status/renewal

Any displayed financial metric must clearly distinguish provider-reported/off-platform job value from money processed by iFixIt.

### 14.2 Provider charts — DEFER / OPTIONAL

Weekly job volume, revenue trend, service popularity and customer satisfaction trends are useful but not required for the first operational release.

---

## 15. Admin Dashboard & Reporting Expansion

### 15.1 Additional admin reporting — ADOPT

In addition to the current five core reports, reporting architecture should support:
- provider growth/activity
- customer growth/activity
- service demand
- geographic demand
- lead generation/conversion
- satisfaction trends
- subscription churn/retention
- marketplace coverage

### 15.2 Supply/demand analysis — CONFIRMED / EXPAND

Supply/demand reporting should support:
- requests by island/service
- active/eligible providers by island/service
- requests per eligible provider
- unassigned/no-provider count
- fallback rate
- average assignment time
- recommendation/alert classification such as high demand / low supply

### 15.3 Business KPIs — ADOPT AS MANAGEMENT METRICS

Support calculation/reporting of:
- subscription revenue
- active subscriptions/providers
- provider churn/retention
- registered/active customers
- monthly requests
- marketplace completion rate
- customer satisfaction
- average revenue per provider from platform subscriptions

Business targets (e.g. Year 1/2/3 numeric targets) remain planning targets rather than system constraints.

---

## 16. Review Model Reconciliation

### 16.1 Rating dimensions — SYNCHRONIZE

Current iFixIt baseline retains five dimensions:
- Quality
- Punctuality
- Communication
- Professionalism
- Value for Money

The business specification's four-dimension model is not adopted because it omits Professionalism.

### 16.2 Verified review — CONFIRMED

Only eligible completed/finalized platform jobs may create a verified service review.

Provider may respond to reviews if public-response functionality is enabled.

Admin moderation requires reason/audit.

---

## 17. Complaint/Resolution Reconciliation

### 17.1 Complaint types — ADOPT / EXPAND

Complaint taxonomy may include customer-side issues such as:
- no-show
- poor workmanship
- unexpected pricing
- unsafe/unprofessional behaviour
- misrepresented skill/info
- property damage
- repeat/incomplete issue

Provider-side complaints may include:
- abusive customer
- fraudulent request
- unreasonable demands
- non-payment
- other

### 17.2 Refunds/compensation — MODIFY

Because customer repair money is outside iFixIt MVP, the platform must not claim it can automatically issue a repair refund or compensation from funds it does not control.

Admin may record:
- recommended refund
- provider-agreed refund
- rework/remediation
- warning
- suspension
- mutual settlement
- complaint dismissal

Integrated refund/escrow functions are future payment-scope features.

---

## 18. Notification Expansion

### 18.1 Notification preferences — ADOPT

Users should be able to manage allowed notification channels/preferences subject to mandatory security/transactional notices.

Channels:
- in-app
- SMS
- email
- WhatsApp when integrated/consented
- web/push notification when supported

### 18.2 Event catalogue — SYNCHRONIZE

Existing notification events remain authoritative and may also include:
- new lead
- provider/customer message where messaging exists
- review received/reminder
- provider verification outcome
- admin/support message

---

## 19. Technical Requirements Reconciliation

### 19.1 Approved architecture remains technology-flexible

The following are valid implementation candidates, not mandatory frozen vendors/libraries:
- Redis for caching/queues
- Elasticsearch/Algolia for advanced search
- S3-compatible object storage
- Firebase/OneSignal for push
- Twilio/other SMS adapter
- SendGrid/other email adapter
- local/approved payment gateway

Technology selection should follow Step 2/architecture decisions and cost/operational fit.

### 19.2 Native apps — DEFER

MVP remains mobile-first responsive web architecture unless a separate native-app decision is approved.

Native iOS/Android apps may be Phase 2/3.

### 19.3 Performance/scalability targets — MODIFY

The business specification's 10,000 concurrent / 100,000 users / 10,000 daily requests are capacity aspirations, not launch load requirements.

Architecture should scale horizontally where practical, but actual sizing follows observed load and approved non-functional targets.

---

## 20. Mobile-First UX Additions

### 20.1 ADOPT

UI baseline should emphasize:
- phone-first responsive layouts
- minimum practical touch target size
- minimal typing
- large primary actions
- camera/media upload
- easy island selection
- clear availability labels
- one-tap Call/WhatsApp where enabled
- bottom navigation where appropriate
- fast/lazy media loading

### 20.2 Accessibility

Status must not depend on color alone. Availability and job states require text labels/icons as well as color.

---

## 21. Onboarding Additions

### 21.1 Customer onboarding — ADOPT

Visitor may browse before registration.

Registration is required at the point a protected action needs identity/persistence.

Authentication remains phone/OTP-based per existing baseline.

### 21.2 Provider onboarding — SYNCHRONIZE

Provider onboarding shall support these logical steps, though screens may be combined for usability:
1. phone + OTP
2. account type
3. profile details
4. verification documents
5. exact services
6. operational base + service areas
7. pricing
8. availability
9. subscription plan
10. subscription payment
11. submit for approval
12. admin review
13. activation when all eligibility conditions pass

Payment alone must not activate marketplace visibility.

---

## 22. Launch, Marketing & Provider Acquisition

### 22.1 Business launch strategy — ADOPT AS NON-FUNCTIONAL BUSINESS PLAN

Initial operating focus remains a narrow configurable launch.

Candidate Greater Malé launch areas:
- Malé
- Hulhumalé
- Villimalé

Candidate priority categories:
- AC
- Plumbing
- Electrical
- Carpentry

These remain operational launch candidates, not application-code restrictions.

### 22.2 Provider acquisition — ADOPT AS GO-TO-MARKET GUIDANCE

Business plan may use:
- direct provider outreach
- social/community groups
- referrals
- hardware/equipment supplier partnerships
- founding-provider incentives
- free/discounted trial periods where commercially approved

### 22.3 Customer acquisition — ADOPT AS GO-TO-MARKET GUIDANCE

Business plan may use:
- social media
- referral programs
- local business/guesthouse partnerships
- content/search marketing

Marketing strategy is not an application security/functional requirement, but is preserved here for product/business planning.

---

## 23. Long-Term Expansion

Architecture should remain extensible for:
- business-provider team/staff accounts
- team scheduling/dispatch
- advanced analytics/CRM
- featured listings
- corporate/enterprise accounts
- maintenance contracts/SLA management
- public API
- white-label solutions
- marine/hospitality/property services
- integrated customer payments/wallet/escrow
- provider payouts
- route optimization
- AI-assisted diagnosis/matching
- predictive maintenance

These items are not MVP unless separately approved.

---

## 24. Items Still Requiring Explicit Business Decision

Before production implementation, explicitly decide:

1. Lead distribution mode: broadcast vs progressive ranked vs round-robin/fairness.
2. Whether subscription plans limit lead count in MVP.
3. Final subscription plan names/prices/discounts/grace period.
4. Review edit/delete windows.
5. Exact urgent/standard/scheduled lead timeout values.
6. Whether public provider phone/WhatsApp is always visible or provider-configurable.
7. Whether in-platform messaging is MVP or later.
8. Whether featured listings launch in MVP or later.
9. Auto-finalization period after provider completion.
10. Cancellation cutoffs.
11. Warranty first-line handling.
12. Business-provider staff/team scope.

---

## 25. Downstream Synchronization Required

The following existing documents should be updated before coding so the adopted additions above are reflected consistently:
- `SYSTEM_REQUIREMENTS_AND_USE_CASES.md`
- `STEP_1_USER_FLOW_AND_ARCHITECTURE.md`
- `STEP_2_DESIGN_AND_TECH_APPROACH.md`
- `STEP_3_DETAILED_USE_CASES_AND_BUSINESS_RULES.md`
- `STEP_4_FINAL_UI_AND_SCREEN_SPECIFICATION.md`
- `STEP_5_FUNCTIONAL_SPECIFICATION_FREEZE.md`
- `STEP_6_DATABASE_SCHEMA_AND_DATA_DICTIONARY.md`
- `STEP_7_API_CONTRACTS.md`
- `STEP_8_ROLES_AND_PERMISSION_MATRIX.md` where required
- `STEP_9_FORMAL_STATE_TRANSITION_MATRICES.md`
- `STEP_10_TEST_CASES_AND_ACCEPTANCE_CRITERIA.md`
- `STEP_11_UML_SYSTEM_DESIGN.md`

Until synchronization is complete, this document records the newly accepted additions and the existing approved baseline documents continue to resolve conflicts.

---

## 26. Reconciliation Summary

### Newly accounted for in GitHub through this document

- Call/WhatsApp direct-contact behavior
- favourites and saved/default locations
- expanded provider profile fields
- richer verification/document types and badges
- five customer-facing pricing models
- availability statuses, weekly schedule and date overrides
- urgent vs scheduled availability/geographic rules
- richer search filters/sort/card requirements
- lead inbox/status/timeout architecture
- configurable subscription entitlements and plan limits
- detailed household-service catalogue as seed-data candidates
- provider KPI/dashboard requirements
- expanded admin/business reporting and churn metrics
- broader complaint taxonomy
- notification preferences
- mobile-first UX specifics
- onboarding sequence refinements
- featured/additional revenue as deferred architecture
- launch/provider/customer acquisition guidance
- long-term enterprise/marine/hospitality/payment/AI expansion

### Existing stronger rules preserved

- canonical island IDs
- local-first geographic tiers with controlled fallback
- OTP/session authentication baseline
- normalized PostgreSQL-oriented data architecture
- customer repair payments outside MVP
- provider subscriptions as primary MVP monetization
- Direct Provider Booking + Smart Matching
- FIXED_PRICE + DIAGNOSIS_REQUIRED workflow classification
- versioned quotations
- server-side authorization
- audit/state-history/concurrency requirements

**Decision:** The comprehensive business specification is now represented in the GitHub blueprint through this reconciliation layer, except for items explicitly marked NEEDS DECISION or DEFER.