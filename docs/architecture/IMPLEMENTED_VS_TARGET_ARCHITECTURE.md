# iFixIt — Implemented vs Target Architecture

**Status:** Implementation traceability source of truth  
**Current database implementation:** migrations 0001–0005  
**Date:** 2026-08-19

## Status Definitions

- **IMPLEMENTED FOUNDATION** — represented by committed migration/schema logic today.
- **DOCUMENTED / PLANNED** — approved or documented requirement, but not yet fully implemented in committed migrations/application services.
- **TARGET / OPTIONAL INTEGRATION** — external infrastructure or technology choice shown in architecture diagrams but not yet selected/implemented as an authoritative dependency.

## Capability Matrix

| Capability | Status | Current source / next step |
|---|---|---|
| Users | IMPLEMENTED FOUNDATION | `0001_core_domain.sql` |
| Phone / OTP authentication data model | IMPLEMENTED FOUNDATION | `0002_auth_rbac.sql` |
| Roles / permissions / user-role mappings | IMPLEMENTED FOUNDATION | `0002_auth_rbac.sql` |
| Auth sessions / attempts / security events | IMPLEMENTED FOUNDATION | `0002_auth_rbac.sql` |
| Canonical Atolls / Islands | IMPLEMENTED FOUNDATION | `0001_core_domain.sql` |
| Island aliases | IMPLEMENTED FOUNDATION | `0003_location_catalogue.sql` |
| Category → Subcategory → Exact Service | IMPLEMENTED FOUNDATION | `0003_location_catalogue.sql` |
| FIXED_PRICE / DIAGNOSIS_REQUIRED metadata | IMPLEMENTED FOUNDATION | `0003_location_catalogue.sql` |
| Provider profiles | IMPLEMENTED FOUNDATION | `0001_core_domain.sql` |
| Legal registration vs operational base | IMPLEMENTED FOUNDATION | `0001_core_domain.sql` |
| Provider exact services | IMPLEMENTED FOUNDATION | `0004_provider_onboarding_service_areas_availability.sql` |
| Provider service pricing | IMPLEMENTED FOUNDATION | `0004_provider_onboarding_service_areas_availability.sql` |
| Provider approved service islands | IMPLEMENTED FOUNDATION | `0004_provider_onboarding_service_areas_availability.sql` |
| Weekly availability / overrides | IMPLEMENTED FOUNDATION | `0004_provider_onboarding_service_areas_availability.sql` |
| Verification document metadata | IMPLEMENTED FOUNDATION | `0004_provider_onboarding_service_areas_availability.sql` |
| Repair request core | IMPLEMENTED FOUNDATION | `0001_core_domain.sql` + 0003 binding |
| Direct Provider Booking model | IMPLEMENTED FOUNDATION | 0001 request model + `0005_search_tier_matching_engine.sql` |
| Smart Matching model | IMPLEMENTED FOUNDATION | `0005_search_tier_matching_engine.sql` |
| Tier 0 same operational-base island | IMPLEMENTED FOUNDATION | `0005_search_tier_matching_engine.sql` |
| Tier 1 explicit service-area island | IMPLEMENTED FOUNDATION | `0005_search_tier_matching_engine.sql` |
| Tier 2 controlled same-atoll fallback | IMPLEMENTED FOUNDATION | `0005_search_tier_matching_engine.sql` |
| Tier 3 explicit cross-atoll authorization | IMPLEMENTED FOUNDATION | 0001 consent fields + 0005 matching rules |
| Matching-attempt audit | IMPLEMENTED FOUNDATION | `0005_search_tier_matching_engine.sql` |
| Matching candidates / ranking snapshots | IMPLEMENTED FOUNDATION | `0005_search_tier_matching_engine.sql` |
| Provider leads / offer expiry / decline | IMPLEMENTED FOUNDATION | `0005_search_tier_matching_engine.sql` |
| Exclusive assignments | IMPLEMENTED FOUNDATION | `0005_search_tier_matching_engine.sql` |
| Atomic concurrency-safe acceptance | IMPLEMENTED FOUNDATION | `0005_search_tier_matching_engine.sql` |
| Direct Booking fallback consent | IMPLEMENTED FOUNDATION | `0005_search_tier_matching_engine.sql` |
| Full repair job lifecycle | DOCUMENTED / PLANNED | Migration 0006 |
| Scheduling / detailed job timeline | DOCUMENTED / PLANNED | Migration 0006 |
| Inspections | DOCUMENTED / PLANNED | Migration 0007 |
| Versioned quotations / customer approval | DOCUMENTED / PLANNED | Migration 0007 |
| Completion workflow / richer evidence | DOCUMENTED / PLANNED | Migration 0007 |
| Off-platform payment acknowledgement | DOCUMENTED / PLANNED | Migration 0008 |
| Payment disagreement/dispute records | DOCUMENTED / PLANNED | Migration 0008 |
| Reviews / ratings | DOCUMENTED / PLANNED | Migration 0009 |
| Complaints / moderation | DOCUMENTED / PLANNED | Migration 0009 |
| Multi-channel notification engine | DOCUMENTED / PLANNED | Migration 0009 |
| Provider subscriptions | DOCUMENTED / PLANNED | Migration 0010 |
| Promotional campaigns / Founding Provider | DOCUMENTED / PLANNED | Migration 0010 |
| Subscription eligibility bound to matching | DOCUMENTED / PLANNED | Migration 0010 replaces temporary entitlement snapshot authority |
| Admin operational reporting | DOCUMENTED / PLANNED | Migration 0011 |
| Security / performance hardening | DOCUMENTED / PLANNED | Migration 0012 |
| WhatsApp Business API | TARGET / OPTIONAL INTEGRATION | Integration adapter; provider/vendor not yet frozen |
| SMS gateway | TARGET / OPTIONAL INTEGRATION | Integration adapter; provider/vendor not yet frozen |
| Email provider | TARGET / OPTIONAL INTEGRATION | Integration adapter; provider/vendor not yet frozen |
| Push notification vendor | TARGET / OPTIONAL INTEGRATION | Integration adapter; provider/vendor not yet frozen |
| Object storage | TARGET / OPTIONAL INTEGRATION | Private media/document storage required; vendor not yet frozen |
| Maps / routing vendor | TARGET / OPTIONAL INTEGRATION | Supplementary; canonical islands remain authoritative |
| Identity / business verification vendor | TARGET / OPTIONAL INTEGRATION | Optional integration; admin/manual verification remains possible |
| Redis / cache technology | TARGET / OPTIONAL INTEGRATION | Not required to define business correctness |
| Queue / worker technology | TARGET / OPTIONAL INTEGRATION | Needed as architecture matures; vendor/runtime not frozen |
| Kubernetes | TARGET / OPTIONAL INTEGRATION | Deployment option, not an approved implementation requirement |
| Full in-app chat | TARGET / OPTIONAL / DEFERRED | Not required for MVP unless explicitly approved |

## Non-Negotiable Rules Regardless of Implementation Phase

1. Free-text island strings never determine provider eligibility.
2. Cross-atoll assignment is never silent.
3. UI visibility never substitutes for server-side authorization.
4. Direct Booking cannot silently reassign the customer to another provider.
5. Customer repair money is not held, escrowed, split, refunded or paid out by iFixIt in MVP.
6. Provider subscription payments are distinct from repair-payment acknowledgement.
7. DIAGNOSIS_REQUIRED repair work cannot bypass customer approval of the current quotation version.
8. Exclusive provider acceptance must remain atomic/concurrency-safe.
9. Sensitive administrative decisions require audit history.

## Migration Roadmap

```text
0001 Core Domain
0002 Authentication & RBAC
0003 Maldives Location Master & Service Catalogue
0004 Provider Onboarding / Services / Areas / Availability
0005 Search & Tier-Based Matching
0006 Repair Requests & Full Job Lifecycle
0007 Inspection / Versioned Quotation / Completion
0008 Off-Platform Payment Acknowledgement & Disputes
0009 Reviews / Complaints / Notifications
0010 Provider Subscriptions & Promotional Campaigns
0011 Admin Panel / Reporting
0012 Security & Performance Hardening
```

## Usage Rule

For developers and reviewers, this matrix is the bridge between the target context diagrams and the committed implementation. Do not infer that an architecture box is production-ready merely because it appears in a diagram.
